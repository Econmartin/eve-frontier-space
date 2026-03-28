import { Outlet } from 'react-router';
import { Header } from '@/components/organisms/Header';

export function AppShell() {
  return (
    <div className="course-shell h-screen flex flex-col overflow-clip">
      <Header />
      <div className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
