import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="overflow-x-hidden min-h-screen flex bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950/95 dark:text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 h-screen overflow-y-auto p-4 overflow-x-hidden lg:ml-72">
        <div className="w-full max-w-7xl mx-auto">
          <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
          <div className="min-h-[calc(100vh-6rem)]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
