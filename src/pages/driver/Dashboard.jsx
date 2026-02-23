import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getDriverClients,
  getDriverTrips,
  getDriverOrders
} from "../../api/admin";
import { Link } from "react-router-dom";
import { isSameLocalDay } from "../../utils/dateTime";

const DriverDashboard = () => {
  const { user } = useContext(AuthContext);

  const [clients, setClients] = useState([]);
  const [trips, setTrips] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (user?.token) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [clientsData, tripsData, ordersData] =
        await Promise.all([
          getDriverClients(user.token),
          getDriverTrips(user.token),
          getDriverOrders(user.token)
        ]);

      setClients(clientsData || []);
      setTrips(tripsData || []);
      setOrders(ordersData || []);

    } catch (err) {
      console.error("Driver dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CALCULATIONS ================= */

  const today = new Date();

  const todayTrips = useMemo(() => {
    return trips.filter(
      (t) =>
        isSameLocalDay(t.created_at, today)
    );
  }, [trips]);

  const todayOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        isSameLocalDay(o.created_at, today)
    );
  }, [orders]);

  const totalContainersHandled = useMemo(() => {
    return orders.reduce(
      (sum, o) => sum + Number(o.quantity || 1),
      0
    );
  }, [orders]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">

      <section className="page-hero">
        <p className="page-eyebrow">Operations</p>
        <h1 className="page-title">Driver Dashboard</h1>
        <p className="page-subtitle">
          Welcome back, <span className="font-semibold text-white">{user?.name}</span>. Track your trips and daily activity.
        </p>
      </section>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

        <SummaryCard
          title="Assigned Clients"
          value={clients.length}
        />

        <SummaryCard
          title="Total Trips"
          value={trips.length}
        />

        <SummaryCard
          title="Today's Trips"
          value={todayTrips.length}
        />

        <SummaryCard
          title="Containers Handled"
          value={totalContainersHandled}
        />

      </div>

      {/* QUICK ACTION */}
      <div className="mb-10">
        <Link
          to="/driver/trip"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3"
        >
          + Start New Trip
        </Link>
      </div>

      {/* TODAY'S ACTIVITY */}
      <SectionCard title="Today's Activity">

        {todayTrips.length === 0 &&
        todayOrders.length === 0 ? (
          <EmptyState message="No activity recorded today." />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">

            <ActivityCard
              label="Trips Completed"
              value={todayTrips.length}
              color="blue"
            />

            <ActivityCard
              label="Orders Processed"
              value={todayOrders.length}
              color="green"
            />

            <ActivityCard
              label="Active Clients"
              value={clients.length}
              color="orange"
            />

          </div>
        )}

      </SectionCard>

    </div>
  );
};

/* ================= COMPONENTS ================= */

const SectionCard = ({ title, children }) => (
  <div className="panel">
    <div className="panel-header">
      <h2 className="section-title">{title}</h2>
    </div>
    <div className="panel-body">{children}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="empty-state">
    {message}
  </div>
);

const SummaryCard = ({ title, value }) => (
  <div className="stat-card">
    <h3 className="stat-label">{title}</h3>
    <h2 className="mt-3 text-2xl font-bold text-slate-900">{value}</h2>
  </div>
);

const ActivityCard = ({ label, value, color }) => {
  const colorMap = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-amber-100 text-amber-700"
  };

  return (
    <div className="rounded-xl bg-slate-50 p-6 ring-1 ring-slate-200 transition hover:shadow-md">
      <div
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${colorMap[color]}`}
      >
        Today
      </div>
      <h3 className="text-sm text-slate-600">{label}</h3>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">{value}</h2>
    </div>
  );
};

export default DriverDashboard;


