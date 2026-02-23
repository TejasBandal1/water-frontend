import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";

/* ================= ADMIN ================= */
import AdminDashboard from "./pages/admin/Dashboard";
import Clients from "./pages/admin/Clients";
import Containers from "./pages/admin/Containers";
import Pricing from "./pages/admin/Pricing";
import Invoices from "./pages/admin/Invoices";
import Users from "./pages/admin/Users";
import AuditLogs from "./pages/admin/AuditLogs";
import InvoiceDetail from "./pages/admin/InvoiceDetail";
import Analytics from "./pages/admin/Analytics";
import DeliveryMatrix from "./pages/admin/DeliveryMatrix";
import MissingBills from "./pages/admin/MissingBills";

/* ================= DRIVER ================= */
import DriverDashboard from "./pages/driver/Dashboard";
import Trip from "./pages/driver/Trip";
import DriverTripHistory from "./pages/driver/DriverTripHistory";
import DriverOrders from "./pages/driver/DriverOrders";

/* ================= CLIENT ================= */
import ClientDashboard from "./pages/client/Dashboard";

/* ================= MANAGER ================= */
import ManagerDashboard from "./pages/manager/Dashboard";

/* ================= EXTRA ================= */
const Unauthorized = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
      <h1 className="mb-4 text-2xl font-bold text-red-600">
        Unauthorized Access
      </h1>
      <p className="text-slate-500">
        You don't have permission to access this page.
      </p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
      <h1 className="mb-4 text-2xl font-bold">
        404 - Page Not Found
      </h1>
      <p className="text-slate-500">
        The page you are looking for does not exist.
      </p>
    </div>
  </div>
);

function App() {
  const { user } = useContext(AuthContext);

  /* ================= AUTO REDIRECT ROOT ================= */
  const getDefaultRoute = () => {
    if (!user) return "/login";

    switch (user.role) {
      case "admin":
        return "/admin";
      case "manager":
        return "/manager";
      case "driver":
        return "/driver";
      case "client":
        return "/client";
      default:
        return "/login";
    }
  };

  return (
    <Routes>

      {/* ================= PUBLIC ================= */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={getDefaultRoute()} replace />
          ) : (
            <Login />
          )
        }
      />

      {/* ================= ADMIN ================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="containers" element={<Containers />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:invoiceId" element={<InvoiceDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="users" element={<Users />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="delivery-matrix" element={<DeliveryMatrix />} />
        <Route path="missing-bills" element={<MissingBills />} />
      </Route>

      {/* ================= MANAGER ================= */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManagerDashboard />} />
      </Route>

      {/* ================= DRIVER ================= */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["driver"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DriverDashboard />} />
        <Route path="trip" element={<Trip />} />
        <Route path="history" element={<DriverTripHistory />} />
        <Route path="orders" element={<DriverOrders />} />
      </Route>

      {/* ================= CLIENT ================= */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboard />} />
      </Route>

      {/* ================= SYSTEM ================= */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;

