import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';
import { EnvironmentConfig } from '../config/environment';
import { BiometricService } from '../services/biometric.service';

interface SavedAddress {
  id: string;
  label: string; // Home, Work, etc.
  address: string;
  isDefault: boolean;
}

import { UserProfile } from '../types';

import { saveUserIfNotExists as bootstrapSaveUserIfNotExists } from '../lib/userProfileBootstrap';
import { cacheOwnerTenantIds, readCachedOwnerTenantIds } from '../lib/ownerRedirect';

/** Keep owner tenant ids stable when Firestore snapshots arrive without them. */
function mergeProfileFromSnapshot(
  uid: string,
  data: Record<string, unknown>,
  prev: UserProfile | null,
): UserProfile {
  const fromSnap = { userId: uid, ...data } as UserProfile;
  const snapOwned = Array.isArray(fromSnap.ownedTenantIds)
    ? fromSnap.ownedTenantIds.filter(Boolean)
    : [];
  const prevOwned =
    prev?.userId === uid && Array.isArray(prev.ownedTenantIds)
      ? prev.ownedTenantIds.filter(Boolean)
      : [];
  const ownedTenantIds = snapOwned.length > 0 ? snapOwned : prevOwned;
  const role =
    ownedTenantIds.length > 0 && (!fromSnap.role || fromSnap.role === 'user')
      ? 'owner'
      : fromSnap.role;

  return { ...fromSnap, ownedTenantIds, role };
}

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
      const { getDb } = await import('../lib/firebase-db');
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await Promise.race([
        getDoc(doc(getDb(), 'users', user.uid)),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Profile fetch timeout')), 6_000);
        }),
      ]);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (data.userId && data.userId !== user.uid) {
          console.warn(
            `[Auth] users/${user.uid} has mismatched userId field (${data.userId}). App uses document ID; run repair-user-by-email if login fails.`,
          );
        }
        setUserProfile((prev) => mergeProfileFromSnapshot(user.uid, { ...data }, prev));
      }
    } catch (err) {
      console.error('Profile refresh failed:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let profileTimeoutId: number | null = null;
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

      if (profileTimeoutId !== null) {
        window.clearTimeout(profileTimeoutId);
        profileTimeoutId = null;
      }

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      void (async () => {
        let profileBootstrapDone = false;

        try {
          const { getDb } = await import('../lib/firebase-db');
          const { doc, onSnapshot } = await import('firebase/firestore');
          const userRef = doc(getDb(), 'users', user.uid);

          unsubProfile = onSnapshot(
            userRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile((prev) =>
                  mergeProfileFromSnapshot(user.uid, docSnap.data(), prev),
                );
              }
              if (profileBootstrapDone) {
                setProfileLoading(false);
              }
            },
            (err) => {
              console.warn('Real-time profile sync blocked or failed.', err);
              if (profileBootstrapDone) {
                setProfileLoading(false);
              }
            },
          );

          try {
            const profile = await Promise.race([
              bootstrapSaveUserIfNotExists({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                phone: user.phoneNumber,
              }),
              new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error('Firebase connection timeout')), 5000);
              }),
            ]);

            const profileOwned = Array.isArray(profile.ownedTenantIds)
              ? profile.ownedTenantIds.filter(Boolean)
              : [];
            const cachedOwned = readCachedOwnerTenantIds();
            const ownedIds = profileOwned.length > 0 ? profileOwned : cachedOwned;
            const elevatedRole =
              ownedIds.length > 0 && (!profile.role || profile.role === 'user')
                ? 'owner'
                : profile.role;
            if (ownedIds.length > 0) {
              cacheOwnerTenantIds(ownedIds);
              setUserProfile({
                ...profile,
                ownedTenantIds: ownedIds,
                role: elevatedRole || 'owner',
              } as UserProfile);
            } else {
              setUserProfile({ ...profile, role: elevatedRole || profile.role } as UserProfile);
            }
          } catch (err) {
            console.error('Auth Profile Error:', err);
            await refreshProfile();
          } finally {
            profileBootstrapDone = true;
            setProfileLoading(false);
          }
        } catch (err) {
          console.error('Auth Profile Sync Error:', err);
          profileBootstrapDone = true;
          setProfileLoading(false);
        }
      })();

      profileTimeoutId = window.setTimeout(() => {
        setProfileLoading(false);
      }, 4_000);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(authFallback);
      if (profileTimeoutId !== null) window.clearTimeout(profileTimeoutId);
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [refreshProfile]);

  const logout = async () => {
    try {
      await BiometricService.clearCredentials();
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("cart");
    setUserProfile(null);
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const loginPath = path.startsWith('/super-admin') ? '/super-admin/login' : path.startsWith('/admin') ? '/admin/login' : '/login';
    window.location.href = EnvironmentConfig.getBaseUrl() + loginPath;
  };

  const login = (user: any) => {
    setCurrentUser(user);
    // Profile is handled by onAuthStateChanged listener
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, logout, login, loading, profileLoading, refreshProfile }}>
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
