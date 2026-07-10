import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="dashboard-shell flex min-h-screen overflow-x-hidden bg-[#F7FAFC] text-[#0F172A] transition-colors duration-300 dark:bg-[#061A2F] dark:text-[#F8FAFC]">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onCollapseToggle={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main className={`h-screen flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_9%_0%,rgba(219,234,254,0.92),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(224,242,254,0.82),transparent_25%),linear-gradient(135deg,#F8FAFC_0%,#EEF6FF_100%)] p-4 transition-[margin] duration-300 dark:bg-[radial-gradient(circle_at_12%_0%,rgba(37,99,235,0.18),transparent_28%),radial-gradient(circle_at_85%_16%,rgba(6,182,212,0.12),transparent_28%),linear-gradient(135deg,#061A2F_0%,#041527_100%)] ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
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
