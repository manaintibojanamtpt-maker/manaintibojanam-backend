import { useAuth } from '../context/AuthContext';
import { isCustomerPreviewMode } from '../lib/storefrontPreview';

/**
 * Storefront-only auth view. In customer preview mode (owner "Visit store"),
 * UI behaves as if the visitor is a guest even though Firebase session may exist.
 */
export function useStorefrontAuth() {
  const auth = useAuth();
  const preview = isCustomerPreviewMode();

  return {
    ...auth,
    currentUser: preview ? null : auth.currentUser,
    userProfile: preview ? null : auth.userProfile,
    isCustomerPreview: preview,
    realCurrentUser: auth.currentUser,
    realUserProfile: auth.userProfile,
  };
}
