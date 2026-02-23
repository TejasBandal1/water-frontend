import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  getContainerLoss,
  getMonthlyRevenue,
  getOutstanding
} from "../../api/admin";

const PIE_COLORS = ["#16a34a", "#f59e0b", "#dc2626"];

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
      const [outstandingRes, revenueRes, containerRes] = await Promise.all([
        getOutstanding(),
        getMonthlyRevenue(period, fromDate, toDate),
        getContainerLoss(fromDate, toDate)
      ]);

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
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const totalRevenue = useMemo(
    () => revenueData.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
    [revenueData]
  );

  const totalBilled = Number(summary.total_billed || 0);
  const totalPaid = Number(summary.total_paid || 0);
  const totalOutstanding = Number(summary.total_outstanding || 0);
  const collectionRate = Number(summary.collection_rate || 0);

  const totalDelivered = useMemo(
    () =>
      containerData.reduce(
        (sum, row) => sum + Number(row.delivered || 0),
        0
      ),
    [containerData]
  );

  const totalReturned = useMemo(
    () =>
      containerData.reduce(
        (sum, row) => sum + Number(row.returned || 0),
        0
      ),
    [containerData]
  );

  const totalContainersOutside = useMemo(
    () =>
      containerData.reduce(
        (sum, row) => sum + Math.max(Number(row.net_outstanding || 0), 0),
        0
      ),
    [containerData]
  );

  const returnEfficiency =
    totalDelivered > 0
      ? Number(((totalReturned / totalDelivered) * 100).toFixed(1))
      : 0;

  const averageRevenue =
    revenueData.length > 0
      ? totalRevenue / revenueData.length
      : 0;

  const revenueSeries = useMemo(
    () =>
      revenueData.map((row) => ({
        label: formatPeriodLabel(row.label, period),
        revenue: Number(row.revenue || 0)
      })),
    [revenueData, period]
  );

  const containerFlowSeries = useMemo(
    () =>
      containerData
        .map((row) => ({
          name: `C-${row.container_id}`,
          delivered: Number(row.delivered || 0),
          returned: Number(row.returned || 0),
          outstanding: Math.max(Number(row.net_outstanding || 0), 0)
        }))
        .sort((a, b) => b.outstanding - a.outstanding),
    [containerData]
  );

  const collectionPieData = useMemo(() => {
    const pending = Math.max(totalBilled - totalPaid - totalOutstanding, 0);

    const rows = [
      { name: "Collected", value: totalPaid },
      { name: "Outstanding", value: totalOutstanding },
      { name: "Unallocated", value: pending }
    ].filter((row) => row.value > 0);

    return rows;
  }, [totalBilled, totalPaid, totalOutstanding]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <section className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Analytics Suite
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Business Intelligence Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-200">
              Revenue, payment health, and container circulation in one view.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-slate-500 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none ring-0 transition focus:border-blue-400"
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
              className="rounded-xl border border-slate-500 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-slate-500 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400"
            />

            <button
              onClick={fetchData}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} trend="up" subtitle={`Avg ${formatCurrency(averageRevenue)} per ${period.slice(0, -2) || "period"}`} />
        <KpiCard title="Collection Rate" value={`${collectionRate}%`} trend={collectionRate >= 80 ? "up" : "down"} subtitle="Paid / billed performance" />
        <KpiCard title="Outstanding Value" value={formatCurrency(totalOutstanding)} trend="warn" subtitle="Pending client payments" />
        <KpiCard title="Containers Outside" value={totalContainersOutside} trend="neutral" subtitle={`Return efficiency ${returnEfficiency}%`} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          subtitle={`Revenue movement grouped by ${period}`}
        >
          {revenueSeries.length === 0 ? (
            <EmptyState message="No revenue data for selected filters" />
          ) : (
            <ResponsiveContainer width="100%" height={310}>
              <AreaChart data={revenueSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<MoneyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Billing Composition"
          subtitle="Collected vs outstanding distribution"
        >
          {collectionPieData.length === 0 ? (
            <EmptyState message="No billing distribution data" />
          ) : (
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Pie
                  data={collectionPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={108}
                  paddingAngle={4}
                >
                  {collectionPieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Container Flow"
          subtitle="Delivered vs returned units per container"
        >
          {containerFlowSeries.length === 0 ? (
            <EmptyState message="No container flow data for selected range" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={containerFlowSeries}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="delivered" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="returned" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Outstanding by Container"
          subtitle="Pending return units by container type"
        >
          {containerFlowSeries.length === 0 ? (
            <EmptyState message="No outstanding container data" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={containerFlowSeries}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  width={70}
                />
                <Tooltip />
                <Bar
                  dataKey="outstanding"
                  fill="#f97316"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">Financial Snapshot</h2>
          <p className="text-xs text-slate-500">Auto-calculated from confirmed invoices and trip logs</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Snapshot label="Total Billed" value={formatCurrency(totalBilled)} />
          <Snapshot label="Total Paid" value={formatCurrency(totalPaid)} />
          <Snapshot label="Returned Units" value={totalReturned} />
        </div>
      </section>
    </div>
  );
};

const formatPeriodLabel = (rawLabel, period) => {
  const date = new Date(rawLabel);
  if (Number.isNaN(date.getTime())) return rawLabel;

  if (period === "daily") {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    });
  }

  if (period === "weekly") {
    return `Wk ${date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    })}`;
  }

  if (period === "yearly") {
    return date.toLocaleDateString("en-IN", { year: "numeric" });
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit"
  });
};

const MoneyTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-slate-600">
        Revenue: <span className="font-semibold text-blue-700">Rs. {Number(payload[0].value || 0).toLocaleString("en-IN")}</span>
      </p>
    </div>
  );
};

const KpiCard = ({ title, value, subtitle, trend = "neutral" }) => {
  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    warn: "text-amber-600",
    neutral: "text-slate-800"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${trendColor[trend]}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    <div className="mt-4">{children}</div>
  </div>
);

const Snapshot = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-[310px] items-center justify-center text-sm text-slate-400">
    {message}
  </div>
);

export default Analytics;
