import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="ob-auth-layout min-h-[100dvh] text-[#fffaf3]">
      <Outlet />
    </div>
  );
}
