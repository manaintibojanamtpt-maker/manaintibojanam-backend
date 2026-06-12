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

    // Safety fallback: if Firebase Auth takes too long (e.g. IndexedDB corrupted), force load
    const safetyTimeout = setTimeout(() => {
      console.warn('[AuthContext] Auth initialization timed out. Forcing load to prevent splash screen hang.');
      setLoading(false);
    }, 3000);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      clearTimeout(safetyTimeout);
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
            const profile = await saveUserIfNotExists({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              phone: user.phoneNumber
            });
            
            // Set initial profile if snapshot hasn't triggered yet
            setUserProfile((prev) => prev ? prev : profile);

            // Real-time sync for profile (Dynamically import Firestore)
            const { getDb } = await import('../lib/firebase-db');
            const { doc, onSnapshot } = await import('firebase/firestore');

            const userRef = doc(getDb(), 'users', user.uid);
            unsubProfile = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile({ userId: docSnap.id, ...docSnap.data() } as unknown as UserProfile);
              }
            });
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Auth Profile Error:", err);
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
