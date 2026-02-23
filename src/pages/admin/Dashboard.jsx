import { useEffect, useState, useMemo } from "react";
import {
  getOutstanding,
  getMonthlyRevenue,
  getContainerLoss,
  getContainers
} from "../../api/admin";

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Area,
  AreaChart
} from "recharts";

const AdminDashboard = () => {
  const [period, setPeriod] = useState("monthly");
  const [summary, setSummary] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [containerData, setContainerData] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      //  TOKEN NO LONGER PASSED MANUALLY
      const o = await getOutstanding();
      const r = await getMonthlyRevenue(period);
      const c = await getContainerLoss();
      const ct = await getContainers();

      setSummary(o || {});
      setRevenueData(r || []);
      setContainerData(c || []);
      setContainers(ct || []);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FORMATTERS ================= */

  const formatCurrency = (v) =>
    `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;

  const getContainerName = (id) =>
    containers.find((c) => c.id === id)?.name || `Container ${id}`;

  /* ================= CALCULATIONS ================= */

  const totalRevenue = useMemo(() => {
    return revenueData.reduce(
      (sum, r) => sum + Number(r.revenue || 0),
      0
    );
  }, [revenueData]);

  const totalOutstanding = summary.total_outstanding || 0;
  const collectionRate = summary.collection_rate || 0;

  const totalContainersOutside = useMemo(() => {
    return containerData.reduce(
      (sum, c) =>
        sum + Math.max(Number(c.net_outstanding || 0), 0),
      0
    );
  }, [containerData]);

  const revenueGrowth = useMemo(() => {
    if (revenueData.length < 2) return 0;

    const last = Number(revenueData.at(-1)?.revenue || 0);
    const prev = Number(revenueData.at(-2)?.revenue || 0);

    if (prev === 0) return 0;

    return Number((((last - prev) / prev) * 100).toFixed(1));
  }, [revenueData]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Business Performance Dashboard
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            Financial and operational overview
          </p>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white shadow-sm text-sm focus:ring-2 focus:ring-black"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">

        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          growth={revenueGrowth}
          color="green"
        />

        <KpiCard
          title="Outstanding Amount"
          value={formatCurrency(totalOutstanding)}
          color="red"
        />

        <KpiCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          color={collectionRate > 80 ? "green" : "red"}
        />

        <KpiCard
          title="Containers Outside"
          value={totalContainersOutside}
          subtitle="Delivered - Returned"
          color="orange"
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* Revenue Trend */}
        <ChartCard
          title="Revenue Trend"
          subtitle={`Aggregated by ${period}`}
        >
          {revenueData.length === 0 ? (
            <EmptyState message="No revenue data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  fill="#93c5fd"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Container Circulation */}
        <ChartCard
          title="Container Circulation"
          subtitle="Units currently with clients"
        >
          {containerData.length === 0 ? (
            <EmptyState message="No container data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={containerData.map((c) => ({
                  name: getContainerName(c.container_id),
                  value: Math.max(c.net_outstanding || 0, 0)
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#f97316"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

/* Reusable Components */

const KpiCard = ({ title, value, growth, subtitle, color }) => {
  const colorMap = {
    green: "text-green-600",
    red: "text-red-600",
    orange: "text-orange-600"
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <h2 className={`text-2xl font-bold mt-2 ${colorMap[color]}`}>
        {value}
      </h2>

      {growth !== undefined && (
        <p
          className={`mt-2 text-sm font-semibold ${
            growth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {growth >= 0 ? "+" : "-"} {Math.abs(growth)}%
        </p>
      )}

      {subtitle && (
        <p className="text-gray-500 text-sm mt-2">{subtitle}</p>
      )}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
    <h2 className="text-lg font-semibold text-gray-800">
      {title}
    </h2>
    {subtitle && (
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
    )}
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
    {message}
  </div>
);

export default AdminDashboard;

