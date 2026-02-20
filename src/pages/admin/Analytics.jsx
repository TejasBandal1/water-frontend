import { useEffect, useState, useMemo } from "react";
import {
  getOutstanding,
  getMonthlyRevenue,
  getContainerLoss
} from "../../api/admin";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";

const Analytics = () => {
  const [period, setPeriod] = useState("monthly");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [summary, setSummary] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [containerData, setContainerData] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      // ✅ TOKEN NOT PASSED ANYMORE
      const outstandingRes = await getOutstanding();

      const revenueRes = await getMonthlyRevenue(
        period,
        fromDate,
        toDate
      );

      const containerRes = await getContainerLoss(
        fromDate,
        toDate
      );

      setSummary(outstandingRes || {});
      setRevenueData(revenueRes || []);
      setContainerData(containerRes || []);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

  /* ================= CALCULATIONS ================= */

  const totalRevenue = useMemo(() => {
    return revenueData.reduce(
      (sum, m) => sum + Number(m.revenue || 0),
      0
    );
  }, [revenueData]);

  const totalOutstanding = summary.total_outstanding || 0;
  const totalBilled = summary.total_billed || 0;
  const totalPaid = summary.total_paid || 0;
  const collectionRate = summary.collection_rate || 0;

  const totalContainersOutside = useMemo(() => {
    return containerData.reduce(
      (sum, c) =>
        sum + Math.max(Number(c.net_outstanding || 0), 0),
      0
    );
  }, [containerData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Business Intelligence Dashboard
        </h1>
        <p className="text-gray-500 text-sm sm:text-base mt-1">
          Revenue, containers and operational insights
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-6 rounded-2xl shadow-md mb-10 
                      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="p-2 border rounded-lg"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="p-2 border rounded-lg"
        />

        <button
          onClick={fetchData}
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          Apply Filters
        </button>
      </div>

      {/* KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-12">

        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} type="positive" />
        <KpiCard title="Total Billed" value={formatCurrency(totalBilled)} />
        <KpiCard title="Total Paid" value={formatCurrency(totalPaid)} type="positive" />
        <KpiCard title="Outstanding" value={formatCurrency(totalOutstanding)} type="danger" />
        <KpiCard title="Collection Rate" value={`${collectionRate}%`} type={collectionRate > 80 ? "positive" : "danger"} />
        <KpiCard title="Containers Outside" value={totalContainersOutside} subtitle="Units pending return" />

      </div>

      {/* REVENUE CHART */}
      <ChartCard title="Revenue Trend" subtitle={`Aggregated by ${period}`}>
        {revenueData.length === 0 ? (
          <EmptyState message="No revenue data available" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                fill="#93c5fd"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* CONTAINER CHART */}
      <ChartCard title="Container Circulation" subtitle="Units currently with clients">
        {containerData.length === 0 ? (
          <EmptyState message="No container data available" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={containerData.map((c) => ({
                name: `C-${c.container_id}`,
                value: Math.max(c.net_outstanding || 0, 0)
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

    </div>
  );
};

const KpiCard = ({ title, value, type, subtitle }) => {
  const colorMap = {
    positive: "text-green-600",
    danger: "text-red-600"
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <h2 className={`text-2xl font-bold mt-2 ${colorMap[type] || "text-gray-800"}`}>
        {value}
      </h2>
      {subtitle && <p className="text-gray-400 text-xs mt-2">{subtitle}</p>}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-md mb-12 border">
    <h2 className="text-lg font-semibold">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
    {message}
  </div>
);

export default Analytics;