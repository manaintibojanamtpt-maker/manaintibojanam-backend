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

import { saveUserIfNotExists } from '../services/api';
import { resolveOwnerTenantIds } from '../lib/ownerAccess';

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
      const { doc, getDocFromServer } = await import('firebase/firestore');
      const snap = await Promise.race([
        getDocFromServer(doc(getDb(), 'users', user.uid)),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
        }),
      ]);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (data.userId && data.userId !== user.uid) {
          console.warn(
            `[Auth] users/${user.uid} has mismatched userId field (${data.userId}). App uses document ID; run repair-user-by-email if login fails.`,
          );
        }
        const ownedIds = await resolveOwnerTenantIds(user.uid, user.email);
        if (ownedIds.length > 0) {
          setUserProfile({ userId: snap.id, ...data, ownedTenantIds: ownedIds, role: data.role || 'owner' } as UserProfile);
        } else {
          setUserProfile({ userId: snap.id, ...data } as UserProfile);
        }
      }
    } catch (err) {
      console.error('Profile refresh failed:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let resolved = false;
    let profileTimeoutId: number | null = null;

    const finishAuthLoading = () => {
      if (resolved) return;
      resolved = true;
      setLoading(false);
    };

    const authTimeout = window.setTimeout(finishAuthLoading, 3000);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      finishAuthLoading();

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
              saveUserIfNotExists({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                phone: user.phoneNumber,
              }),
              new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error('Firebase connection timeout')), 8000);
              }),
            ]);

            const ownedIds = await resolveOwnerTenantIds(user.uid, user.email);
            const elevatedRole =
              ownedIds.length > 0 && (!profile.role || profile.role === 'user')
                ? 'owner'
                : profile.role;
            if (ownedIds.length > 0) {
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
      }, 12000);
    });

    return () => {
      window.clearTimeout(authTimeout);
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
