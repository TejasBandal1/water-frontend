import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelInvoice,
  confirmInvoice,
  generateAllInvoices,
  getClients,
  getInvoices,
  voidReissueInvoice
} from "../../api/admin";
import {
  compareDatesDesc,
  formatLocalDate,
  isWithinLocalDateRange
} from "../../utils/dateTime";

const ITEMS_PER_PAGE = 8;

const Invoices = () => {
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

  const [actionModal, setActionModal] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoiceData, clientData] = await Promise.all([
        getInvoices(),
        getClients()
      ]);
      setInvoices(invoiceData || []);
      setClients(clientData || []);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => formatLocalDate(date);

  const openActionModal = (config) => {
    setActionReason("");
    setActionModal(config);
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setActionModal(null);
    setActionReason("");
  };

  const runAction = async () => {
    if (!actionModal) return;

    if (actionModal.requiresReason && actionReason.trim().length < 3) {
      showToast("Please enter a valid reason (minimum 3 characters)");
      return;
    }

    try {
      setActionLoading(true);

      if (actionModal.type === "confirm") {
        await confirmInvoice(actionModal.invoiceId);
        showToast(`Invoice #${actionModal.invoiceId} confirmed`);
      }

      if (actionModal.type === "cancel") {
        await cancelInvoice(actionModal.invoiceId, actionReason.trim());
        showToast(`Invoice #${actionModal.invoiceId} cancelled`);
      }

      if (actionModal.type === "void_reissue") {
        const res = await voidReissueInvoice(actionModal.invoiceId, actionReason.trim());
        showToast(
          `Invoice #${res.old_invoice_id} voided. New draft #${res.new_invoice_id} created.`
        );
      }

      if (actionModal.type === "generate_all") {
        const res = await generateAllInvoices();
        showToast(
          `Generated: ${res.generated.length} | Skipped: ${res.skipped.length}`
        );
      }

      await fetchData();
      setActionModal(null);
      setActionReason("");
    } catch (err) {
      showToast(err?.response?.data?.detail || "Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

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

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Invoice Management</h1>
          <p className="text-sm text-gray-500">
            Billing overview and tracking
          </p>
        </div>

        <button
          onClick={() =>
            openActionModal({
              type: "generate_all",
              title: "Generate Draft Invoices",
              message:
                "This will create draft invoices for all active clients where billable trips are available. Continue?",
              confirmLabel: "Generate Drafts",
              requiresReason: false
            })
          }
          className="rounded-lg bg-black px-5 py-2 text-white transition hover:bg-gray-800"
        >
          Generate Drafts
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Billed" value={formatCurrency(totalBilled)} />
        <SummaryCard title="Collected" value={formatCurrency(totalCollected)} />
        <SummaryCard title="Outstanding" value={formatCurrency(totalOutstanding)} />
        <SummaryCard title="Overdue" value={overdueCount} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border bg-white p-5 shadow-md md:grid-cols-6">
        <input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-lg border p-2 focus:ring-2 focus:ring-black"
        />

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="rounded-lg border p-2"
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
          className="rounded-lg border p-2"
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
          className="rounded-lg border p-2"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border p-2"
        />

        <button
          onClick={resetFilters}
          className="rounded-lg bg-gray-200 text-sm hover:bg-gray-300"
        >
          Reset
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-md">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            No invoices found
          </div>
        ) : (
          <table className="min-w-full text-left">
            <thead className="sticky top-0 border-b bg-gray-100">
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
                const balance = inv.total_amount - inv.amount_paid;
                const canAdjust =
                  ["draft", "pending", "overdue"].includes(inv.status) &&
                  Number(inv.amount_paid || 0) === 0;

                return (
                  <tr key={inv.id} className="border-b transition hover:bg-gray-50">
                    <td className="p-4 font-semibold">#{inv.id}</td>
                    <td className="p-4">{inv.client_name}</td>
                    <td className="p-4">{formatDate(inv.created_at)}</td>
                    <td className="p-4">{formatCurrency(inv.total_amount)}</td>
                    <td className={`p-4 font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[inv.status]}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/invoices/${inv.id}`}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white"
                        >
                          View
                        </Link>

                        {inv.status === "draft" && (
                          <button
                            onClick={() =>
                              openActionModal({
                                type: "confirm",
                                invoiceId: inv.id,
                                title: `Confirm Invoice #${inv.id}`,
                                message:
                                  "After confirmation, this invoice becomes active and due date will be assigned. Continue?",
                                confirmLabel: "Confirm Invoice",
                                requiresReason: false
                              })
                            }
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white"
                          >
                            Confirm
                          </button>
                        )}

                        {canAdjust && (
                          <button
                            onClick={() =>
                              openActionModal({
                                type: "void_reissue",
                                invoiceId: inv.id,
                                title: `Void and Reissue Invoice #${inv.id}`,
                                message:
                                  "This will cancel the current invoice and generate a corrected draft using latest pricing. Provide a reason.",
                                confirmLabel: "Void and Reissue",
                                requiresReason: true
                              })
                            }
                            className="rounded-lg bg-amber-600 px-3 py-1 text-xs text-white"
                          >
                            Void & Reissue
                          </button>
                        )}

                        {canAdjust && (
                          <button
                            onClick={() =>
                              openActionModal({
                                type: "cancel",
                                invoiceId: inv.id,
                                title: `Cancel Invoice #${inv.id}`,
                                message:
                                  "This will cancel the invoice without creating a new one. Provide a reason.",
                                confirmLabel: "Cancel Invoice",
                                requiresReason: true
                              })
                            }
                            className="rounded-lg bg-gray-600 px-3 py-1 text-xs text-white"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`rounded-lg px-3 py-1 ${
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

      {actionModal && (
        <ActionModal
          title={actionModal.title}
          message={actionModal.message}
          confirmLabel={actionModal.confirmLabel}
          requiresReason={actionModal.requiresReason}
          reason={actionReason}
          onReasonChange={setActionReason}
          loading={actionLoading}
          onClose={closeActionModal}
          onConfirm={runAction}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl bg-black px-6 py-3 text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value }) => (
  <div className="rounded-2xl border bg-white p-6 shadow-md transition hover:shadow-lg">
    <h3 className="text-sm text-gray-500">{title}</h3>
    <h2 className="mt-2 text-2xl font-bold">{value}</h2>
  </div>
);

const ActionModal = ({
  title,
  message,
  confirmLabel,
  requiresReason,
  reason,
  onReasonChange,
  loading,
  onClose,
  onConfirm
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{message}</p>

      {requiresReason && (
        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reason
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter reason for audit history"
            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed"
        >
          Close
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || (requiresReason && reason.trim().length < 3)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? "Processing..." : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default Invoices;
