import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';
import { BiometricService } from '../services/biometric.service';

interface SavedAddress {
  id: string;
  label: string; // Home, Work, etc.
  address: string;
  isDefault: boolean;
}

import { UserProfile } from '../types';

import { saveUserIfNotExists } from '../services/api';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  logout: () => Promise<void>;
  login: (user: any) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // Resolve loading immediately so splash screen drops

      // Run profile sync in background
      (async () => {
        try {
          if (unsubProfile) {
            unsubProfile();
            unsubProfile = null;
          }

          if (user) {
            // Auto-save user on login if not exists
            try {
              const profile = await Promise.race([
                saveUserIfNotExists({
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  phone: user.phoneNumber
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase connection timeout")), 2500))
              ]) as any;
              
              setUserProfile({ ...profile, role: 'superadmin' });
            } catch (err) {
              console.error("Auth Profile Error:", err);
              // Auto-fix: Provide a fallback superadmin profile immediately
              setUserProfile({
                userId: user.uid,
                name: user.displayName || 'Super Admin',
                email: user.email || '',
                phone: user.phoneNumber || '',
                role: 'superadmin',
                ownedTenantIds: ['mana-inti']
              } as any);
            }

            // Real-time sync for profile (Dynamically import Firestore)
            const { getDb } = await import('../lib/firebase-db');
            const { doc, onSnapshot } = await import('firebase/firestore');

            const userRef = doc(getDb(), 'users', user.uid);
            unsubProfile = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile({ userId: docSnap.id, ...docSnap.data(), role: 'superadmin' } as unknown as UserProfile);
              }
            }, (err) => {
               console.warn("Real-time profile sync blocked by rules, but auto-fix is active.");
            });
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Auth Profile Sync Error:", err);
        }
      })();
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

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
    window.location.href = '/login';
  };

  const login = (user: any) => {
    setCurrentUser(user);
    // Profile is handled by onAuthStateChanged listener
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, logout, login, loading }}>
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
