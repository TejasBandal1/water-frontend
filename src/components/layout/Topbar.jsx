import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const Topbar = ({ toggleSidebar, toggleCollapse, collapsed }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-8">

      {/* LEFT */}
      <div className="flex items-center gap-4">

        <button
          onClick={toggleSidebar}
          className="md:hidden text-2xl text-gray-700"
        >
          ☰
        </button>

        <button
          onClick={toggleCollapse}
          className="hidden md:block text-xl text-gray-600"
        >
          {collapsed ? "➡" : "⬅"}
        </button>

        <h1 className="text-lg md:text-xl font-semibold text-gray-800">
          Water Management System
        </h1>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>

        <span className="hidden sm:inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
          {user?.role?.toUpperCase()}
        </span>

        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-1.5 rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;
