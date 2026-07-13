import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { SettingsPreferenceViewModel } from '@bhojan/storefront-design-system/settings';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useCustomerProfile } from '@/features/auth/hooks/useCustomerProfile';
import { updateCustomerPreferences } from '@/features/auth/infrastructure/customerRepository';

const SPICE_LEVELS = ['Mild', 'Medium', 'Hot'] as const;
const DIETARY_OPTIONS = ['Veg', 'Egg', 'Non-veg'] as const;

export function useCustomerSettingsActions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sessionUser } = useAuth();
  const profileQuery = useCustomerProfile();

  const preferenceRows = useMemo((): readonly SettingsPreferenceViewModel[] => {
    const prefs = profileQuery.data?.preferences;
    return [
      { id: 'spice', icon: '🌶', label: 'Spice level', value: prefs?.spiceLevel ?? 'Medium' },
      { id: 'dietary', icon: '🥬', label: 'Dietary', value: prefs?.dietary ?? 'Veg' },
      {
        id: 'notifications',
        icon: '🔔',
        label: 'Push notifications',
        value: prefs?.notifications === false ? 'Off' : 'On',
      },
    ];
  }, [profileQuery.data?.preferences]);

  const handlePreferenceRow = (id: string) => {
    const uid = sessionUser?.uid;
    if (!uid) return;

    if (id === 'notifications') {
      navigate('/notifications');
      return;
    }

    const prefs = profileQuery.data?.preferences;
    if (id === 'spice') {
      const current = prefs?.spiceLevel ?? 'Medium';
      const next = SPICE_LEVELS[(SPICE_LEVELS.indexOf(current) + 1) % SPICE_LEVELS.length]!;
      void updateCustomerPreferences(uid, { spiceLevel: next }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['customer', 'profile', uid] });
      });
      return;
    }

    if (id === 'dietary') {
      const current = prefs?.dietary ?? 'Veg';
      const next = DIETARY_OPTIONS[(DIETARY_OPTIONS.indexOf(current) + 1) % DIETARY_OPTIONS.length]!;
      void updateCustomerPreferences(uid, { dietary: next }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['customer', 'profile', uid] });
      });
    }
  };

  return {
    preferenceRows,
    handlePreferenceRow,
  };
}
