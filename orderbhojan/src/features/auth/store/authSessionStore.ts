import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthSessionStore {
  guestBrowsing: boolean;
  deviceId: string;
  setGuestBrowsing: (value: boolean) => void;
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
      guestBrowsing: true,
      deviceId: createDeviceId(),
      setGuestBrowsing: (value) => set({ guestBrowsing: value }),
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
        deviceId: state.deviceId,
      }),
    },
  ),
);
