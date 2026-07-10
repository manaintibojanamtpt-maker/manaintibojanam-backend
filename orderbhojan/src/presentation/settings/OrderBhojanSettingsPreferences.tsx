import { useNavigate } from 'react-router-dom';
import type { SettingsPreferenceViewModel } from '@bhojan/storefront-design-system/settings';

export const CUSTOMER_PREFERENCE_ROWS: readonly SettingsPreferenceViewModel[] = [
  { id: 'spice', icon: '🌶', label: 'Spice level', value: 'Medium' },
  { id: 'dietary', icon: '🥬', label: 'Dietary', value: 'Veg' },
  { id: 'notifications', icon: '🔔', label: 'Notifications', value: 'On' },
];

export function useCustomerSettingsActions() {
  const navigate = useNavigate();

  const handlePreferenceRow = (id: string) => {
    if (id === 'notifications') {
      navigate('/notifications');
    }
  };

  return {
    preferenceRows: CUSTOMER_PREFERENCE_ROWS,
    handlePreferenceRow,
  };
}
