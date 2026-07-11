import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-[100dvh] bg-[#070504] text-white">
      <Outlet />
    </div>
  );
}
