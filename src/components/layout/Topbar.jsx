import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const Topbar = ({ toggleSidebar, toggleCollapse, collapsed }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-200/70 bg-white/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 md:hidden"
          >
            MENU
          </button>

          <button
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            className="hidden md:inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {collapsed ? "EXPAND" : "COLLAPSE"}
          </button>

          <h1 className="text-base font-semibold text-slate-900 md:text-lg">
            Water Management System
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <span className="hidden rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">
            {user?.role?.toUpperCase()}
          </span>

          <button
            onClick={logout}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
