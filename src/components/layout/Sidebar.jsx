import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { BRAND } from "../../config/brand";

const getLinkClasses = ({ isActive }) =>
  [
    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
    isActive
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
  ].join(" ");

const IconDot = ({ code }) => (
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-700/80 text-[10px] font-bold leading-none text-slate-200 group-hover:bg-slate-700 group-hover:text-white">
    {code}
  </span>
);

const SidebarNavItem = ({ to, code, label, collapsed, onNavigate }) => (
  <NavLink to={to} end className={getLinkClasses} onClick={onNavigate}>
    <IconDot code={code} />
    {!collapsed && <span>{label}</span>}
  </NavLink>
);

const Sidebar = ({ collapsed, onNavigate }) => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  return (
    <aside className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 p-4 text-white">
      <div className="mb-8 px-1">
        {!collapsed ? (
          <>
            <h2 className="text-xl font-bold tracking-tight">{BRAND.name}</h2>
            <p className="text-xs text-slate-400">{BRAND.shortName}</p>
          </>
        ) : (
          <div className="text-center text-xs font-semibold text-slate-300">{BRAND.initials}</div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {user.role === "admin" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs uppercase tracking-wider text-slate-500">Administration</p>
            )}
            <SidebarNavItem to="/admin" code="DB" label="Dashboard" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/clients" code="CL" label="Clients" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/containers" code="CT" label="Containers" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/pricing" code="PR" label="Pricing" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/invoices" code="IV" label="Invoices" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/analytics" code="AN" label="Analytics" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/delivery-matrix" code="DM" label="Delivery Matrix" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/missing-bills" code="MB" label="Missing Bills" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/users" code="US" label="Users" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/admin/audit" code="LG" label="Audit Logs" collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        )}

        {user.role === "manager" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs uppercase tracking-wider text-slate-500">Management</p>
            )}
            <SidebarNavItem to="/manager" code="OV" label="Overview" collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        )}

        {user.role === "driver" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs uppercase tracking-wider text-slate-500">Operations</p>
            )}
            <SidebarNavItem to="/driver" code="DB" label="Dashboard" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/driver/trip" code="TR" label="New Trip" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/driver/history" code="HS" label="Trip History" collapsed={collapsed} onNavigate={onNavigate} />
            <SidebarNavItem to="/driver/orders" code="OD" label="Orders" collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        )}

        {user.role === "client" && (
          <div className="space-y-2">
            <SidebarNavItem to="/client" code="DB" label="Dashboard" collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-800 pt-5 text-xs text-slate-400">
          Logged in as
          <div className="mt-1 font-semibold text-slate-200">{user.role.toUpperCase()}</div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
