import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex bg-gray-50 min-h-screen">

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 
          ${collapsed ? "w-20" : "w-64"}
          bg-gray-900
          transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          transition-all duration-300 ease-in-out
          md:translate-x-0 md:static
        `}
      >
        <Sidebar collapsed={collapsed} />
      </div>

      {/* Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        <Topbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          toggleCollapse={() => setCollapsed(!collapsed)}
          collapsed={collapsed}
        />

        <main className="p-4 md:p-8 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
