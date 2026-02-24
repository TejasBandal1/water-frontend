import { useCallback, useEffect, useMemo, useState } from "react";
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
  getClients,
  getContainerLoss,
  getMonthlyRevenue,
  getOutstanding,
  getPaymentBreakdown
} from "../../api/admin";

const PIE_COLORS = ["#16a34a", "#f59e0b", "#dc2626"];
const PAYMENT_CHANNEL_COLORS = ["#0f766e", "#2563eb"];

const Analytics = () => {
  const [period, setPeriod] = useState("monthly");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  const [clientSearch, setClientSearch] = useState("");
  const [showClientOptions, setShowClientOptions] = useState(false);

  const [summary, setSummary] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [containerData, setContainerData] = useState([]);
  const [paymentData, setPaymentData] = useState({
    summary: {},
    by_method: [],
    by_client: []
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    try {
      const data = await getClients();
      setClients((data || []).filter((client) => client.is_active !== false));
    } catch (err) {
      console.error("Failed to load clients for analytics:", err);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const clientId = selectedClientId ? Number(selectedClientId) : undefined;

      const [outstandingRes, revenueRes, containerRes, paymentRes] = await Promise.all([
        getOutstanding(clientId),
        getMonthlyRevenue(period, fromDate, toDate, clientId),
        getContainerLoss(fromDate, toDate, clientId),
        getPaymentBreakdown(fromDate, toDate, clientId)
      ]);

      setSummary(outstandingRes || {});
      setRevenueData(revenueRes || []);
      setContainerData(containerRes || []);
      setPaymentData(
        paymentRes || {
          summary: {},
          by_method: [],
          by_client: []
        }
      );
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate, selectedClientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === String(selectedClientId)) || null,
    [clients, selectedClientId]
  );

  const clientLabel = selectedClient ? selectedClient.name : "All Clients";

  const filteredClientOptions = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients.slice(0, 8);

    return clients
      .filter((client) => {
        const name = (client.name || "").toLowerCase();
        const email = (client.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 8);
  }, [clients, clientSearch]);

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
  const paymentSummary = paymentData.summary || {};
  const paymentByMethod = paymentData.by_method || [];
  const paymentByClient = paymentData.by_client || [];

  const totalCashCollected = Number(paymentSummary.total_cash_amount || 0);
  const totalUpiCollected = Number(paymentSummary.total_upi_amount || 0);
  const totalMixedTransactions = Number(paymentSummary.cash_upi_count || 0);
  const totalPaymentsCount = Number(paymentSummary.payment_count || 0);

  const paymentChannelPieData = useMemo(() => {
    const data = [
      { name: "Cash Collected", value: totalCashCollected },
      { name: "UPI Collected", value: totalUpiCollected }
    ];

    return data.filter((row) => row.value > 0);
  }, [totalCashCollected, totalUpiCollected]);

  const paymentByClientChartData = useMemo(
    () =>
      paymentByClient.slice(0, 8).map((row) => ({
        name: truncateName(row.client_name || `Client ${row.client_id}`),
        cash: Number(row.cash_amount || 0),
        upi: Number(row.upi_amount || 0),
        total: Number(row.total_amount || 0)
      })),
    [paymentByClient]
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
              Revenue, payment health, and container circulation for {clientLabel}.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-5">
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

            <div className="relative">
              <input
                type="text"
                value={clientSearch}
                onFocus={() => setShowClientOptions(true)}
                onBlur={() => window.setTimeout(() => setShowClientOptions(false), 120)}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientOptions(true);
                }}
                placeholder={selectedClient ? selectedClient.name : "Search client..."}
                className="w-full rounded-xl border border-slate-500 bg-slate-800/80 px-3 py-2 pr-20 text-sm text-white outline-none transition focus:border-blue-400"
              />

              {(selectedClientId || clientSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId("");
                    setClientSearch("");
                    setShowClientOptions(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-slate-700/80 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-600"
                >
                  Clear
                </button>
              )}

              {showClientOptions && (
                <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl">
                  <button
                    type="button"
                    onMouseDown={() => {
                      setSelectedClientId("");
                      setClientSearch("");
                      setShowClientOptions(false);
                    }}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    All Clients
                  </button>

                  {filteredClientOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-slate-500">No clients found</p>
                  ) : (
                    filteredClientOptions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={() => {
                          setSelectedClientId(String(client.id));
                          setClientSearch(client.name || "");
                          setShowClientOptions(false);
                        }}
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                      >
                        <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email || "No email"}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

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
              onClick={() => {
                setPeriod("monthly");
                setFromDate("");
                setToDate("");
                setSelectedClientId("");
                setClientSearch("");
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} trend="up" subtitle={`Avg ${formatCurrency(averageRevenue)} per ${period.slice(0, -2) || "period"}`} />
        <KpiCard title="Collection Rate" value={`${collectionRate}%`} trend={collectionRate >= 80 ? "up" : "down"} subtitle="Paid / billed performance" />
        <KpiCard title="Outstanding Value" value={formatCurrency(totalOutstanding)} trend="warn" subtitle={`Pending payments | ${clientLabel}`} />
        <KpiCard title="Containers Outside" value={totalContainersOutside} trend="neutral" subtitle={`Return efficiency ${returnEfficiency}%`} />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Cash Collected" value={formatCurrency(totalCashCollected)} trend="up" subtitle="Payments received in cash" />
        <KpiCard title="UPI Collected" value={formatCurrency(totalUpiCollected)} trend="up" subtitle="Payments received via UPI" />
        <KpiCard title="Mixed Payments" value={totalMixedTransactions} trend="neutral" subtitle="Cash + UPI transactions" />
        <KpiCard title="Payment Entries" value={totalPaymentsCount} trend="neutral" subtitle={`Recorded payments | ${clientLabel}`} />
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

        <ChartCard
          title="Payment Channel Mix"
          subtitle="Cash vs UPI collected amount"
        >
          {paymentChannelPieData.length === 0 ? (
            <EmptyState message="No payment channel data for selected range" />
          ) : (
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Pie
                  data={paymentChannelPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={108}
                  paddingAngle={4}
                >
                  {paymentChannelPieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PAYMENT_CHANNEL_COLORS[index % PAYMENT_CHANNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Client Payment Mix"
          subtitle="Top clients by payment amount (cash + UPI)"
        >
          {paymentByClientChartData.length === 0 ? (
            <EmptyState message="No client payment data for selected filters" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={paymentByClientChartData}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="cash" stackId="payment" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="upi" stackId="payment" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">Financial Snapshot</h2>
          <p className="text-xs text-slate-500">Auto-calculated from confirmed invoices and trip logs | {clientLabel}</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Snapshot label="Total Billed" value={formatCurrency(totalBilled)} />
          <Snapshot label="Total Paid" value={formatCurrency(totalPaid)} />
          <Snapshot label="Returned Units" value={totalReturned} />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">Client-wise Payment Register</h2>
          <p className="text-xs text-slate-500">Track cash, UPI, and mixed transactions by client</p>
        </div>

        {paymentByClient.length === 0 ? (
          <div className="empty-state">No client payment entries for selected filters.</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="table-main min-w-[980px]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total Paid</th>
                  <th>Cash</th>
                  <th>UPI</th>
                  <th>Cash Txns</th>
                  <th>UPI Txns</th>
                  <th>Cash+UPI Txns</th>
                </tr>
              </thead>
              <tbody>
                {paymentByClient.map((row) => (
                  <tr key={row.client_id}>
                    <td>
                      <p className="font-semibold text-slate-900">{row.client_name}</p>
                      <p className="text-xs text-slate-500">Client ID: {row.client_id}</p>
                    </td>
                    <td className="font-semibold text-slate-900">{formatCurrency(row.total_amount)}</td>
                    <td>{formatCurrency(row.cash_amount)}</td>
                    <td>{formatCurrency(row.upi_amount)}</td>
                    <td>{row.cash_only_count}</td>
                    <td>{row.upi_only_count}</td>
                    <td>{row.cash_upi_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const truncateName = (name) => {
  if (!name) return "-";
  return name.length > 16 ? `${name.slice(0, 16)}...` : name;
};

export default Analytics;
