import { useEffect, useState, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import {
  getInvoices,
  confirmInvoice,
  getClients,
  generateAllInvoices,
  cancelInvoice
} from "../../api/admin";
import {
  compareDatesDesc,
  formatLocalDate,
  isWithinLocalDateRange
} from "../../utils/dateTime";

const ITEMS_PER_PAGE = 8;

const Invoices = () => {
  const { user } = useContext(AuthContext);

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const invoiceData = await getInvoices(user.token);
      const clientData = await getClients(user.token);
      setInvoices(invoiceData || []);
      setClients(clientData || []);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => formatLocalDate(date);

  /* ================= ACTIONS ================= */

  const handleConfirm = async (invoiceId) => {
    await confirmInvoice(invoiceId, user.token);
    showToast("Invoice confirmed");
    fetchData();
  };

  const handleCancel = async (invoiceId) => {
    await cancelInvoice(invoiceId, user.token);
    showToast("Invoice cancelled");
    fetchData();
  };

  const handleGenerateAll = async () => {
    const res = await generateAllInvoices(user.token);
    showToast(
      `Generated: ${res.generated.length} | Skipped: ${res.skipped.length}`
    );
    fetchData();
  };

  /* ================= FILTER ================= */

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const clientName = inv.client_name?.toLowerCase() || "";

        return (
          (clientName.includes(searchTerm.toLowerCase()) ||
            inv.id.toString().includes(searchTerm)) &&
          (selectedClient === "all" ||
            inv.client_id === Number(selectedClient)) &&
          (selectedStatus === "all" ||
            inv.status === selectedStatus) &&
          isWithinLocalDateRange(inv.created_at, fromDate, toDate)
        );
      })
      .sort((a, b) => compareDatesDesc(a.created_at, b.created_at));
  }, [
    invoices,
    searchTerm,
    selectedClient,
    selectedStatus,
    fromDate,
    toDate
  ]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(
    filteredInvoices.length / ITEMS_PER_PAGE
  );

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  /* ================= SUMMARY ================= */

  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount || 0),
    0
  );

  const totalCollected = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount_paid || 0),
    0
  );

  const totalOutstanding = totalBilled - totalCollected;

  const overdueCount = invoices.filter(
    (inv) => inv.status === "overdue"
  ).length;

  const statusStyles = {
    draft: "bg-yellow-100 text-yellow-800",
    pending: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-200 text-gray-700"
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedClient("all");
    setSelectedStatus("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Invoice Management
          </h1>
          <p className="text-gray-500 text-sm">
            Billing overview and tracking
          </p>
        </div>

        <button
          onClick={handleGenerateAll}
          className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Generate Drafts
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <SummaryCard title="Total Billed" value={formatCurrency(totalBilled)} />
        <SummaryCard title="Collected" value={formatCurrency(totalCollected)} />
        <SummaryCard title="Outstanding" value={formatCurrency(totalOutstanding)} />
        <SummaryCard title="Overdue" value={overdueCount} />
      </div>

      {/* FILTERS */}
      <div className="bg-white p-5 rounded-2xl shadow-md mb-6 border grid grid-cols-1 md:grid-cols-6 gap-4">

        <input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded-lg focus:ring-2 focus:ring-black"
        />

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
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
          onClick={resetFilters}
          className="bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
        >
          Reset
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-md border overflow-x-auto">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full"></div>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No invoices found
          </div>
        ) : (
          <table className="min-w-full text-left">
            <thead className="bg-gray-100 border-b sticky top-0">
              <tr>
                <th className="p-4">Invoice</th>
                <th className="p-4">Client</th>
                <th className="p-4">Created</th>
                <th className="p-4">Total</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedInvoices.map((inv) => {
                const balance =
                  inv.total_amount - inv.amount_paid;

                return (
                  <tr key={inv.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-4 font-semibold">#{inv.id}</td>
                    <td className="p-4">{inv.client_name}</td>
                    <td className="p-4">{formatDate(inv.created_at)}</td>
                    <td className="p-4">{formatCurrency(inv.total_amount)}</td>
                    <td className={`p-4 font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[inv.status]}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2">
                      <Link
                        to={`/admin/invoices/${inv.id}`}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs"
                      >
                        View
                      </Link>

                      {inv.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleConfirm(inv.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs"
                          >
                            Confirm
                          </button>

                          <button
                            onClick={() => handleCancel(inv.id)}
                            className="px-3 py-1 bg-gray-500 text-white rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-lg ${
                currentPage === i + 1
                  ? "bg-black text-white"
                  : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

    </div>
  );
};

const SummaryCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition">
    <h3 className="text-gray-500 text-sm">{title}</h3>
    <h2 className="text-2xl font-bold mt-2">{value}</h2>
  </div>
);

export default Invoices;


