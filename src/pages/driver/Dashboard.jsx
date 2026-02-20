import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getDriverClients,
  getDriverTrips,
  getDriverOrders
} from "../../api/admin";
import { Link } from "react-router-dom";

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

  const todayString = new Date().toDateString();

  const todayTrips = useMemo(() => {
    return trips.filter(
      (t) =>
        new Date(t.created_at).toDateString() ===
        todayString
    );
  }, [trips]);

  const todayOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        new Date(o.created_at).toDateString() ===
        todayString
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
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          🚚 Driver Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back,{" "}
          <span className="font-semibold">
            {user?.name}
          </span>
        </p>
      </div>

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
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow transition"
        >
          + Start New Trip
        </Link>
      </div>

      {/* TODAY'S ACTIVITY */}
      <SectionCard title="📅 Today's Activity">

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
  <div className="bg-white rounded-2xl shadow">
    <div className="p-6 border-b">
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="text-center py-12 text-gray-400">
    {message}
  </div>
);

const SummaryCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
    <h3 className="text-gray-500 text-sm">{title}</h3>
    <h2 className="text-2xl font-bold mt-3">{value}</h2>
  </div>
);

const ActivityCard = ({ label, value, color }) => {
  const colorMap = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700"
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition">
      <div
        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${colorMap[color]}`}
      >
        Today
      </div>
      <h3 className="text-gray-600 text-sm">{label}</h3>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  );
};

export default DriverDashboard;
