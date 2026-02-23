import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = ({ collapsed, onNavigate }) => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const linkClasses = ({ isActive }) =>
    [
      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-blue-600 text-white shadow-sm"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    ].join(" ");

  const IconDot = ({ code }) => (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold leading-none text-slate-300 group-hover:bg-slate-700 group-hover:text-white">
      {code}
    </span>
  );

  const NavItem = ({ to, code, label }) => (
    <NavLink to={to} end className={linkClasses} onClick={onNavigate}>
      <IconDot code={code} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  return (
    <aside className="flex h-full flex-col bg-slate-900 p-4 text-white">
      <div className="mb-8 px-1">
        {!collapsed ? (
          <>
            <h2 className="text-xl font-bold tracking-tight">WaterSys</h2>
            <p className="text-xs text-slate-400">Operations and Billing</p>
          </>
        ) : (
          <div className="text-center text-xs font-semibold text-slate-300">WS</div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {user.role === "admin" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs uppercase tracking-wider text-slate-500">Administration</p>
            )}
            <NavItem to="/admin" code="DB" label="Dashboard" />
            <NavItem to="/admin/clients" code="CL" label="Clients" />
            <NavItem to="/admin/containers" code="CT" label="Containers" />
            <NavItem to="/admin/pricing" code="PR" label="Pricing" />
            <NavItem to="/admin/invoices" code="IV" label="Invoices" />
            <NavItem to="/admin/analytics" code="AN" label="Analytics" />
            <NavItem to="/admin/delivery-matrix" code="DM" label="Delivery Matrix" />
            <NavItem to="/admin/users" code="US" label="Users" />
            <NavItem to="/admin/audit" code="LG" label="Audit Logs" />
          </div>
        )}

        {user.role === "manager" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs uppercase tracking-wider text-slate-500">Management</p>
            )}
            <NavItem to="/manager" code="OV" label="Overview" />
          </div>
        )}

        {user.role === "driver" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="px-2 text-xs uppercase tracking-wider text-slate-500">Operations</p>
            )}
            <NavItem to="/driver" code="DB" label="Dashboard" />
            <NavItem to="/driver/trip" code="TR" label="New Trip" />
            <NavItem to="/driver/history" code="HS" label="Trip History" />
            <NavItem to="/driver/orders" code="OD" label="Orders" />
          </div>
        )}

        {user.role === "client" && (
          <div className="space-y-2">
            <NavItem to="/client" code="DB" label="Dashboard" />
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
