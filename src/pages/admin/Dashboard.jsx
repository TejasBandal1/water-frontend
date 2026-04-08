import { useEffect, useState, useMemo } from "react";
import {
  getOutstanding,
  getMonthlyRevenue,
  getContainerLoss,
  getContainers,
  getDriverDeliverySummary
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
  const [driverRows, setDriverRows] = useState([]);
  const [driverSummary, setDriverSummary] = useState({});
  const [driverSearch, setDriverSearch] = useState("");
  const [driverFromDate, setDriverFromDate] = useState("");
  const [driverToDate, setDriverToDate] = useState("");
  const [driverLoading, setDriverLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDriverDeliveryData();
    }, 250);

    return () => clearTimeout(timer);
  }, [driverFromDate, driverToDate, driverSearch]);

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

  const fetchDriverDeliveryData = async () => {
    setDriverLoading(true);
    try {
      const response = await getDriverDeliverySummary(
        driverFromDate,
        driverToDate,
        driverSearch
      );
      setDriverRows(response?.rows || []);
      setDriverSummary(response?.summary || {});
    } catch (err) {
      console.error("Driver delivery summary error:", err);
    } finally {
      setDriverLoading(false);
    }
  };

  /* ================= FORMATTERS ================= */

  const formatCurrency = (v) =>
    `Rs. ${Number(v || 0).toLocaleString("en-IN")}`;

  const formatCount = (v) =>
    Number(v || 0).toLocaleString("en-IN");

  const getContainerName = (id) =>
    containers.find((c) => c.id === id)?.name || `Container ${id}`;

  const resetDriverFilters = () => {
    setDriverSearch("");
    setDriverFromDate("");
    setDriverToDate("");
  };

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

  const revenueSeries = useMemo(
    () =>
      revenueData.map((row) => ({
        label: formatPeriodLabel(row.label, period),
        revenue: Number(row.revenue || 0)
      })),
    [revenueData, period]
  );

  const circulationSeries = useMemo(
    () =>
      containerData
        .map((row) => ({
          name: truncateName(getContainerName(row.container_id), 20),
          value: Math.max(Number(row.net_outstanding || 0), 0)
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [containerData, containers]
  );

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="page-shell">

      {/* HEADER */}
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-eyebrow">Overview</p>
            <h1 className="page-title">Business Performance Dashboard</h1>
            <p className="page-subtitle">Financial and operational overview for daily decision-making.</p>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="form-select w-full bg-white text-slate-800 sm:w-56"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </section>

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
          {revenueSeries.length === 0 ? (
            <EmptyState message="No revenue data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => Number(v || 0).toLocaleString("en-IN")}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  fill="url(#dashboardRevenueFill)"
                  strokeWidth={3}
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#1d4ed8" }}
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
          {circulationSeries.length === 0 ? (
            <EmptyState message="No container data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={circulationSeries}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CountTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#f97316"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <section className="panel mt-8 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Driver Delivery Summary</h2>
            <p className="text-sm text-slate-500">
              Track driver-wise delivered jars with searchable and date-range filters.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
            <input
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              placeholder="Search driver name or email"
              className="form-input"
            />
            <input
              type="date"
              value={driverFromDate}
              onChange={(e) => setDriverFromDate(e.target.value)}
              className="form-input"
            />
            <input
              type="date"
              value={driverToDate}
              onChange={(e) => setDriverToDate(e.target.value)}
              className="form-input"
            />
            <button
              onClick={resetDriverFilters}
              className="btn-secondary w-full"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CompactInfo label="Drivers" value={formatCount(driverSummary.drivers_count)} />
          <CompactInfo label="Trips" value={formatCount(driverSummary.total_trip_count)} />
          <CompactInfo label="Delivered Jars" value={formatCount(driverSummary.total_jars_delivered)} />
          <CompactInfo label="Net Outstanding" value={formatCount(driverSummary.total_net_jars_outstanding)} />
        </div>

        <div className="mt-5">
          {driverLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
            </div>
          ) : driverRows.length === 0 ? (
            <EmptyState message="No driver delivery data found for selected filters." />
          ) : (
            <div className="table-shell">
              <table className="table-main">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Trips</th>
                    <th>Delivered</th>
                    <th>Returned</th>
                    <th>Net Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {driverRows.map((row) => (
                    <tr key={row.driver_id}>
                      <td>
                        <p className="font-semibold text-slate-900">{row.driver_name || "Unknown Driver"}</p>
                        <p className="text-xs text-slate-500">{row.driver_email || "-"}</p>
                      </td>
                      <td>{formatCount(row.trip_count)}</td>
                      <td className="font-semibold text-emerald-700">{formatCount(row.total_jars_delivered)}</td>
                      <td>{formatCount(row.total_jars_returned)}</td>
                      <td className={Number(row.net_jars_outstanding || 0) > 0 ? "font-semibold text-amber-700" : "font-semibold text-slate-700"}>
                        {formatCount(row.net_jars_outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
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
    <div className="stat-card">
      <h3 className="stat-label">{title}</h3>
      <h2 className={`mt-2 text-2xl font-bold ${colorMap[color]}`}>
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
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="panel p-6">
    <h2 className="text-lg font-semibold text-slate-800">
      {title}
    </h2>
    {subtitle && (
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
    )}
    {children}
  </div>
);

const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">
        Revenue:{" "}
        <span className="font-semibold text-blue-700">
          Rs. {Number(payload[0].value || 0).toLocaleString("en-IN")}
        </span>
      </p>
    </div>
  );
};

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">
        Units Outside:{" "}
        <span className="font-semibold text-orange-600">
          {Number(payload[0].value || 0).toLocaleString("en-IN")}
        </span>
      </p>
    </div>
  );
};

const CompactInfo = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-60 items-center justify-center text-sm text-slate-400">
    {message}
  </div>
);

const formatPeriodLabel = (rawLabel, period) => {
  const date = new Date(rawLabel);
  if (Number.isNaN(date.getTime())) return rawLabel;

  if (period === "daily") {
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  if (period === "weekly") {
    return `Wk ${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
  }

  if (period === "yearly") {
    return date.toLocaleDateString("en-IN", { year: "numeric" });
  }

  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

const truncateName = (value, max = 18) => {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

export default AdminDashboard;

