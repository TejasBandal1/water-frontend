import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MainLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const stored = window.localStorage.getItem("rr_sidebar_collapsed");
    return stored === "1";
  });

  useEffect(() => {
    window.localStorage.setItem("rr_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-[var(--rr-bg)]">

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40
          ${collapsed ? "w-20" : "w-64"}
          border-r border-slate-800
          transform
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          transition-all duration-300 ease-in-out
          md:translate-x-0 md:static
        `}
      >
        <Sidebar
          collapsed={collapsed}
          onNavigate={closeMobileSidebar}
        />
      </div>

      {/* Overlay (Mobile) */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">

        <Topbar
          toggleSidebar={toggleMobileSidebar}
          closeSidebar={closeMobileSidebar}
          sidebarOpen={mobileSidebarOpen}
          toggleCollapse={() => setCollapsed((prev) => !prev)}
          collapsed={collapsed}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
