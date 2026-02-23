import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getMyInvoices, getMyBalance } from "../../api/client";
import { formatLocalDate } from "../../utils/dateTime";

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  const [invoices, setInvoices] = useState([]);
  const [balance, setBalance] = useState([]);
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

      const [invoiceData, balanceData] = await Promise.all([
        getMyInvoices(user.token),
        getMyBalance(user.token)
      ]);

      setInvoices(invoiceData || []);
      setBalance(balanceData || []);
    } catch (err) {
      console.error("Client dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FORMATTERS ================= */

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => formatLocalDate(date);

  /* ================= CALCULATIONS ================= */

  const totalInvoices = invoices.length;

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter((i) => i.status !== "paid")
      .reduce(
        (sum, i) =>
          sum +
          (Number(i.total_amount || 0) -
            Number(i.amount_paid || 0)),
        0
      );
  }, [invoices]);

  const totalPaid = useMemo(() => {
    return invoices.reduce(
      (sum, i) => sum + Number(i.amount_paid || 0),
      0
    );
  }, [invoices]);

  const overdueAmount = useMemo(() => {
    return invoices
      .filter((i) => i.status === "overdue")
      .reduce(
        (sum, i) =>
          sum +
          (Number(i.total_amount || 0) -
            Number(i.amount_paid || 0)),
        0
      );
  }, [invoices]);

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
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
          Welcome, {user?.name}
        </h1>
        <p className="text-gray-500 mt-1">
          Here's your billing and container summary
        </p>
      </div>

      {/* OVERDUE ALERT */}
      {overdueAmount > 0 && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-xl mb-8">
          You have overdue payments of{" "}
          <strong>{formatCurrency(overdueAmount)}</strong>.
          Please clear them to avoid service interruption.
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

        <SummaryCard
          title="Total Invoices"
          value={totalInvoices}
        />

        <SummaryCard
          title="Outstanding Balance"
          value={formatCurrency(totalOutstanding)}
          danger
        />

        <SummaryCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          success
        />

        <SummaryCard
          title="Overdue Amount"
          value={formatCurrency(overdueAmount)}
          warning
        />

      </div>

      {/* INVOICE TABLE */}
      <SectionCard title="My Invoices">

        {invoices.length === 0 ? (
          <EmptyState message="No invoices available yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">Balance</th>
                  <th className="p-3">Due Date</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((inv) => {
                  const balanceValue =
                    Number(inv.total_amount || 0) -
                    Number(inv.amount_paid || 0);

                  return (
                    <tr
                      key={inv.id}
                      className={`border-b hover:bg-gray-50 ${
                        inv.status === "overdue"
                          ? "bg-red-50"
                          : ""
                      }`}
                    >
                      <td className="p-3 font-semibold">
                        #{inv.id}
                      </td>

                      <td className="p-3">
                        <StatusBadge status={inv.status} />
                      </td>

                      <td className="p-3">
                        {formatCurrency(inv.total_amount)}
                      </td>

                      <td className="p-3">
                        {formatCurrency(inv.amount_paid)}
                      </td>

                      <td
                        className={`p-3 font-semibold ${
                          balanceValue > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(balanceValue)}
                      </td>

                      <td className="p-3">
                        {formatDate(inv.due_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* CONTAINER BALANCE */}
      <SectionCard title="Container Balance">

        {balance.length === 0 ? (
          <EmptyState message="No container balance data." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3">Container</th>
                  <th className="p-3">Balance</th>
                </tr>
              </thead>

              <tbody>
                {balance.map((b) => (
                  <tr
                    key={b.container_id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3">
                      {b.container_name}
                    </td>

                    <td
                      className={`p-3 font-semibold ${
                        b.balance > 0
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {b.balance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

    </div>
  );
};

/* ================= COMPONENTS ================= */

const SectionCard = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow mb-10">
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

const SummaryCard = ({ title, value, danger, success, warning }) => {
  let color = "text-gray-900";

  if (danger) color = "text-red-600";
  if (success) color = "text-green-600";
  if (warning) color = "text-yellow-600";

  return (
    <div className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <h2 className={`text-2xl font-bold mt-2 ${color}`}>
        {value}
      </h2>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    draft: "bg-yellow-100 text-yellow-700",
    pending: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700"
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status?.toUpperCase()}
    </span>
  );
};

export default Dashboard;


