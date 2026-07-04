import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  continueAsGuest,
  completePhoneSignIn,
  signInWithGoogle,
  signOut as signOutUser,
  startPhoneSignIn,
  fetchBearerToken,
} from '@/features/auth/application/authService';
import { bootstrapCustomerSession } from '@/features/auth/application/profileBootstrapService';
import { mapFirebaseUser } from '@/features/auth/infrastructure/firebaseAuth';
import { resolveAuthPhase, type AuthPhase, type AuthSessionUser } from '@/features/auth/domain/auth.types';
import { useAuthSessionStore } from '@/features/auth/store/authSessionStore';
import {
  initializeFirebase,
  isFirebaseConfigured,
  subscribeToAuthState,
} from '@/firebase';
import { setMarketplaceAuthTokenProvider } from '@/marketplace-api';
import { trackEvent } from '@/telemetry';

export type AuthStatus = AuthPhase;

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly sessionUser: AuthSessionUser | null;
  readonly isGuest: boolean;
  readonly isAuthenticated: boolean;
  readonly getIdToken: () => Promise<string | null>;
  readonly signInWithGoogle: () => Promise<void>;
  readonly continueAsGuest: () => Promise<void>;
  readonly startPhoneSignIn: (phone: string, containerId: string) => Promise<void>;
  readonly completePhoneSignIn: (otp: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const guestBrowsing = useAuthSessionStore((state) => state.guestBrowsing);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured());
  const [user, setUser] = useState<User | null>(null);
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    initializeFirebase();
    return subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      const mapped = nextUser ? mapFirebaseUser(nextUser) : null;
      setSessionUser(mapped);
      setAuthReady(true);
      if (mapped && !mapped.isAnonymous && mapped.provider !== 'guest') {
        void bootstrapCustomerSession(mapped);
      }
      trackEvent({
        name: 'auth_state_changed',
        properties: {
          authenticated: Boolean(nextUser && !nextUser.isAnonymous),
          anonymous: Boolean(nextUser?.isAnonymous),
        },
      });
    });
  }, []);

  const status = resolveAuthPhase({
    firebaseConfigured: isFirebaseConfigured(),
    authReady,
    firebaseUser: sessionUser,
    guestBrowsing,
  });

  const signInWithGoogleAction = useCallback(async () => {
    const result = await signInWithGoogle();
    if (result.user) {
      setSessionUser(result.user);
    }
  }, []);

  const continueAsGuestAction = useCallback(async () => {
    const result = await continueAsGuest();
    if (result.user) {
      setSessionUser(result.user);
    }
  }, []);

  const startPhoneSignInAction = useCallback(async (phone: string, containerId: string) => {
    await startPhoneSignIn(phone, containerId);
  }, []);

  const completePhoneSignInAction = useCallback(async (otp: string) => {
    const result = await completePhoneSignIn(otp);
    if (result.user) {
      setSessionUser(result.user);
    }
  }, []);

  const signOutAction = useCallback(async () => {
    await signOutUser();
    setUser(null);
    setSessionUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      sessionUser,
      isGuest: status === 'guest' || status === 'unconfigured',
      isAuthenticated: status === 'authenticated',
      getIdToken: () => fetchBearerToken(),
      signInWithGoogle: signInWithGoogleAction,
      continueAsGuest: continueAsGuestAction,
      startPhoneSignIn: startPhoneSignInAction,
      completePhoneSignIn: completePhoneSignInAction,
      signOut: signOutAction,
    }),
    [
      status,
      user,
      sessionUser,
      signInWithGoogleAction,
      continueAsGuestAction,
      startPhoneSignInAction,
      completePhoneSignInAction,
      signOutAction,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useMarketplaceAuthBinding(): void {
  const { getIdToken } = useAuth();

  useEffect(() => {
    setMarketplaceAuthTokenProvider(getIdToken);
    return () => setMarketplaceAuthTokenProvider(null);
  }, [getIdToken]);
}
