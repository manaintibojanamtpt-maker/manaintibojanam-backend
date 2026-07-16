import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';
import { BiometricService } from '../services/biometric.service';
import { UserProfile } from '../types';
import { saveUserIfNotExists as bootstrapSaveUserIfNotExists } from '../lib/userProfileBootstrap';
import { cacheOwnerTenantIds, readCachedOwnerTenantIds } from '../lib/ownerRedirect';
import {
  buildAuthFallbackProfile,
  hydrateOwnerProfileViaApi,
  isOwnerPortalPath,
  isSuperAdminPortalPath,
  mergeAuthProfile,
  resolveAuthRole,
} from '../lib/authProfile';
import { isFounderOwnerEmail } from '../config/founder';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  logout: () => Promise<void>;
  login: (user: any) => void;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      if (isOwnerPortalPath()) {
        const apiProfile = await hydrateOwnerProfileViaApi(user, null);
        if (apiProfile) {
          setUserProfile(apiProfile);
          return;
        }
      }

      const { getDb, getDoc } = await import('../lib/firebase-db');
      const { doc } = await import('firebase/firestore');
      const snap = await Promise.race([
        getDoc(doc(getDb(), 'users', user.uid)),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Profile fetch timeout')), 6_000);
        }),
      ]);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setUserProfile((prev) => mergeAuthProfile(user.uid, { ...data }, prev));
      } else {
        setUserProfile((prev) => prev ?? buildAuthFallbackProfile(user));
      }
    } catch (err) {
      console.error('Profile refresh failed:', err);
      if (isFounderOwnerEmail(user.email)) {
        setUserProfile((prev) =>
          mergeAuthProfile(
            user.uid,
            {
              ...buildAuthFallbackProfile(user),
              role: 'superadmin',
            },
            prev,
          ),
        );
      } else if (isOwnerPortalPath() || !isSuperAdminPortalPath()) {
        const apiProfile = await hydrateOwnerProfileViaApi(user, null);
        if (apiProfile) {
          setUserProfile(apiProfile);
        } else {
          setUserProfile((prev) => prev ?? buildAuthFallbackProfile(user));
        }
      } else {
        setUserProfile((prev) => prev ?? buildAuthFallbackProfile(user));
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void auth.authStateReady().then(() => {
      if (cancelled) return;
      setCurrentUser(auth.currentUser);
      setLoading(false);
    });

    const authFallback = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 10_000);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }

      const cachedOwned = readCachedOwnerTenantIds();
      setUserProfile(buildAuthFallbackProfile(user, cachedOwned));
      setProfileLoading(true);

      void (async () => {
        try {
          let ownerApiProfile: UserProfile | null = null;
          if (isOwnerPortalPath()) {
            ownerApiProfile = await hydrateOwnerProfileViaApi(user, null);
            if (!cancelled && ownerApiProfile) {
              setUserProfile(ownerApiProfile);
            }
          }

          if (isOwnerPortalPath() && ownerApiProfile) {
            return;
          }

          try {
            const profile = await Promise.race([
              bootstrapSaveUserIfNotExists({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                phone: user.phoneNumber,
              }),
              new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error('Firebase connection timeout')), 6_000);
              }),
            ]);

            if (cancelled) return;

            const profileOwned = Array.isArray(profile.ownedTenantIds)
              ? profile.ownedTenantIds.filter(Boolean)
              : [];
            const ownedIds = profileOwned.length > 0 ? profileOwned : readCachedOwnerTenantIds();
            const role = resolveAuthRole(user.email, profile.role, ownedIds);

            if (ownedIds.length > 0) {
              cacheOwnerTenantIds(ownedIds);
            }

            setUserProfile((prev) =>
              mergeAuthProfile(
                user.uid,
                {
                  ...profile,
                  ownedTenantIds: ownedIds,
                  role,
                },
                prev,
              ),
            );
          } catch (err) {
            console.warn('Firestore profile bootstrap skipped:', err);
            if (isOwnerPortalPath()) {
              // Owner API hydration already attempted above.
            } else if (isFounderOwnerEmail(user.email)) {
              if (!cancelled) {
                setUserProfile((prev) =>
                  mergeAuthProfile(
                    user.uid,
                    {
                      ...buildAuthFallbackProfile(user),
                      role: 'superadmin',
                    },
                    prev,
                  ),
                );
              }
            } else if (!isSuperAdminPortalPath()) {
              const apiProfile = await hydrateOwnerProfileViaApi(user, null);
              if (!cancelled && apiProfile) {
                setUserProfile(apiProfile);
              }
            }
          }
        } catch (err) {
          console.error('Auth profile hydration failed:', err);
        } finally {
          if (!cancelled) setProfileLoading(false);
        }
      })();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(authFallback);
      unsubscribeAuth();
    };
  }, []);

  const logout = async () => {
    try {
      await BiometricService.clearCredentials();
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('cart');
    sessionStorage.removeItem('bhojanos_owner_tenant_ids');
    setUserProfile(null);
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const loginPath = path.startsWith('/super-admin')
      ? '/super-admin/login'
      : path.startsWith('/admin')
        ? '/admin/login'
        : path.startsWith('/owner')
          ? '/owner/login'
          : '/login';
    window.location.href = EnvironmentConfig.getBaseUrl() + loginPath;
  };

  const login = (user: any) => {
    setCurrentUser(user);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile, logout, login, loading, profileLoading, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
