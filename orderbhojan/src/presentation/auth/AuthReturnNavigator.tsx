import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  clearAuthReturnTo,
  readPersistedAuthReturnTo,
} from '@/features/auth/domain/authReturnTo';

/** After Google redirect sign-in, resume stored destination when landing off /auth. */
export function AuthReturnNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, isAuthenticated } = useAuth();

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated || location.pathname === '/auth') return;

    const stored = readPersistedAuthReturnTo();
    if (!stored) return;

    clearAuthReturnTo();
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath !== stored) {
      navigate(stored, { replace: true });
    }
  }, [isAuthenticated, location.pathname, location.search, navigate, status]);

  return null;
}
