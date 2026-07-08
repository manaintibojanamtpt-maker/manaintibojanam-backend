import { Outlet } from 'react-router-dom';
import { Text } from '@bhojan/design-system';

export function AuthLayout() {
  return (
    <Text as="div" className="ob-auth-px2-shell" data-bds-layout="auth">
      <Outlet />
    </Text>
  );
}
