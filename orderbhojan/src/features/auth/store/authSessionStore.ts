import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthSessionStore {
  guestBrowsing: boolean;
  anonymousAuthBlocked: boolean;
  deviceId: string;
  setGuestBrowsing: (value: boolean) => void;
  setAnonymousAuthBlocked: (value: boolean) => void;
  ensureDeviceId: () => string;
  resetSession: () => void;
}

function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ob-web-${crypto.randomUUID()}`;
  }
  return `ob-web-${Date.now()}`;
}

export const useAuthSessionStore = create<AuthSessionStore>()(
  persist(
    (set, get) => ({
      guestBrowsing: false,
      anonymousAuthBlocked: false,
      deviceId: createDeviceId(),
      setGuestBrowsing: (value) => set({ guestBrowsing: value }),
      setAnonymousAuthBlocked: (value) => set({ anonymousAuthBlocked: value }),
      ensureDeviceId: () => {
        const current = get().deviceId;
        if (current) return current;
        const next = createDeviceId();
        set({ deviceId: next });
        return next;
      },
      resetSession: () =>
        set({
          guestBrowsing: true,
          deviceId: createDeviceId(),
        }),
    }),
    {
      name: 'ob-auth-session',
      partialize: (state) => ({
        guestBrowsing: state.guestBrowsing,
        anonymousAuthBlocked: state.anonymousAuthBlocked,
        deviceId: state.deviceId,
      }),
    },
  ),
);
