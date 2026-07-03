/**
 * M5 PR-13 — owner branch feature flags.
 */

export const OWNER_BRANCH_FLAG = 'FF_BRANCH_OWNER_ENABLED' as const;
export const OWNER_BRANCH_FLAG_ENV_KEY = 'VITE_FF_BRANCH_OWNER_ENABLED';

export const isOwnerBranchEnabledDefault = (): boolean => {
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env[OWNER_BRANCH_FLAG_ENV_KEY]
      : undefined;

  if (envValue === 'true') {
    return true;
  }
  if (envValue === 'false') {
    return false;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const isDev =
      import.meta.env.DEV === true || import.meta.env.VITE_APP_ENV === 'development';
    const isPreview = import.meta.env.VITE_APP_ENV === 'preview';
    if (isDev || isPreview) {
      try {
        const localOverride = localStorage.getItem(OWNER_BRANCH_FLAG);
        if (localOverride === 'true') {
          return true;
        }
        if (localOverride === 'false') {
          return false;
        }
      } catch {
        // ignore localStorage errors
      }
    }
  }

  return false;
};

export const setOwnerBranchFlagOverride = (enabled: boolean): void => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return;
  }
  const isDev =
    import.meta.env.DEV === true || import.meta.env.VITE_APP_ENV === 'development';
  const isPreview = import.meta.env.VITE_APP_ENV === 'preview';
  if (!isDev && !isPreview) {
    return;
  }
  try {
    localStorage.setItem(OWNER_BRANCH_FLAG, String(enabled));
  } catch {
    // ignore
  }
};
