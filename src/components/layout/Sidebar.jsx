import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = ({ collapsed, onNavigate }) => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const linkClasses = ({ isActive }) =>
    `
    relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
    transition-all duration-200
    ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    }
  `;

  const NavItem = ({ to, icon, label }) => (
    <NavLink to={to} end className={linkClasses} onClick={onNavigate}>
      <span className="text-lg">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  return (
    <div className="h-full bg-gray-900 text-white p-4 flex flex-col">

      {/* Logo */}
      <div className="mb-10 px-2">
        {!collapsed ? (
          <>
            <h2 className="text-xl font-bold tracking-wide">
              🚰 WaterSys
            </h2>
            <p className="text-gray-400 text-xs">
              Business Management
            </p>
          </>
        ) : (
          <div className="text-2xl text-center">🚰</div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-6 overflow-y-auto">

        {user.role === "admin" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="text-xs text-gray-500 uppercase tracking-wider px-2">
                Administration
              </p>
            )}

            <NavItem to="/admin" icon="📊" label="Dashboard" />
            <NavItem to="/admin/clients" icon="👥" label="Clients" />
            <NavItem to="/admin/containers" icon="🧴" label="Containers" />
            <NavItem to="/admin/pricing" icon="💰" label="Pricing" />
            <NavItem to="/admin/invoices" icon="🧾" label="Invoices" />
            <NavItem to="/admin/analytics" icon="📈" label="Analytics" />
            <NavItem to="/admin/delivery-matrix" icon="📊" label="Delivery Matrix" />
            <NavItem to="/admin/users" icon="🛡" label="Users" />
            <NavItem to="/admin/audit" icon="📜" label="Audit Logs" />
          </div>
        )}

        {user.role === "driver" && (
          <div className="space-y-2">
            {!collapsed && (
              <p className="text-xs text-gray-500 uppercase tracking-wider px-2">
                Operations
              </p>
            )}

            <NavItem to="/driver" icon="📊" label="Dashboard" />
            <NavItem to="/driver/trip" icon="🚚" label="New Trip" />
            <NavItem to="/driver/history" icon="📋" label="Delivery History" />
            <NavItem to="/driver/orders" icon="📦" label="Orders" />
          </div>
        )}

        {user.role === "client" && (
          <NavItem to="/client" icon="📄" label="Dashboard" />
        )}

      </nav>

      {/* FOOTER */}
      {!collapsed && (
        <div className="pt-6 border-t border-gray-800 text-xs text-gray-400">
          Logged in as
          <div className="font-semibold text-gray-200 mt-1">
            {user.role.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
