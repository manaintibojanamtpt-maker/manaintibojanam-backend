import { useQuery } from '@tanstack/react-query';
import { loadCustomerSession } from '../application/profileBootstrapService';
import { useAuth } from '@/shared/providers/AuthProvider';
import { isFirestorePermissionDenied } from '@/lib/firestoreErrors';

export function useCustomerProfile() {
  const { sessionUser, isAuthenticated } = useAuth();
  const uid = sessionUser?.uid;

  return useQuery({
    queryKey: ['customer', 'profile', uid],
    enabled: Boolean(uid && isAuthenticated),
    queryFn: () => loadCustomerSession(uid!),
    retry: (failureCount, error) => {
      if (isFirestorePermissionDenied(error)) return false;
      return failureCount < 2;
    },
  });
}
