import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { BRAND } from "../../config/brand";

const routeMeta = [
  { pattern: /^\/admin\/?$/, title: "Dashboard", scope: "Administration" },
  { pattern: /^\/admin\/clients/, title: "Clients", scope: "Administration" },
  { pattern: /^\/admin\/containers/, title: "Containers", scope: "Administration" },
  { pattern: /^\/admin\/pricing/, title: "Pricing", scope: "Administration" },
  { pattern: /^\/admin\/invoices\/\d+/, title: "Invoice Detail", scope: "Administration" },
  { pattern: /^\/admin\/invoices/, title: "Invoices", scope: "Administration" },
  { pattern: /^\/admin\/analytics/, title: "Analytics", scope: "Administration" },
  { pattern: /^\/admin\/pending-returns/, title: "Pending Returns", scope: "Administration" },
  { pattern: /^\/admin\/delivery-matrix/, title: "Delivery Matrix", scope: "Administration" },
  { pattern: /^\/admin\/missing-bills/, title: "Missing Bills", scope: "Administration" },
  { pattern: /^\/admin\/users/, title: "Users", scope: "Administration" },
  { pattern: /^\/admin\/audit/, title: "Audit Logs", scope: "Administration" },
  { pattern: /^\/manager/, title: "Manager Overview", scope: "Management" },
  { pattern: /^\/driver\/?$/, title: "Driver Dashboard", scope: "Operations" },
  { pattern: /^\/driver\/trip/, title: "New Trip", scope: "Operations" },
  { pattern: /^\/driver\/history/, title: "Trip History", scope: "Operations" },
  { pattern: /^\/driver\/orders/, title: "Orders", scope: "Operations" },
  { pattern: /^\/client/, title: "Client Dashboard", scope: "Client Portal" }
];

const getRouteInfo = (pathname, role) => {
  const found = routeMeta.find((entry) => entry.pattern.test(pathname));

  if (found) {
    return found;
  }

  if (role === "admin") {
    return { title: "Administration", scope: "Administration" };
  }

  if (role === "driver") {
    return { title: "Operations", scope: "Operations" };
  }

  if (role === "manager") {
    return { title: "Manager", scope: "Management" };
  }

  return { title: "Dashboard", scope: "Workspace" };
};

const Topbar = ({
  toggleSidebar,
  closeSidebar,
  sidebarOpen,
  toggleCollapse,
  collapsed
}) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const routeInfo = getRouteInfo(location.pathname, user?.role);

  const role = String(user?.role || "").toLowerCase();
  const roleTone =
    role === "admin"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : role === "driver"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : role === "manager"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-100 text-slate-700 border-slate-200";

  const handleLogout = () => {
    closeSidebar?.();
    logout();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] w-full max-w-[1540px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold tracking-wide text-slate-700 transition hover:bg-slate-100 md:hidden"
          >
            {sidebarOpen ? "CLOSE" : "MENU"}
          </button>

          <button
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            className="hidden md:inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {collapsed ? "EXPAND" : "COLLAPSE"}
          </button>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {routeInfo.scope}
            </p>
            <h1 className="text-sm font-semibold text-slate-900 sm:text-base md:text-lg">
              {routeInfo.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 lg:inline-flex">
            {BRAND.systemName}
          </span>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-2 ring-slate-200">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          <span className={`hidden rounded-full border px-3 py-1 text-xs font-semibold sm:inline-flex ${roleTone}`}>
            {user?.role?.toUpperCase()}
          </span>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
