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

const STATUS_STYLES = {
  draft: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  pending: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  paid: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-100 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-slate-200 text-slate-700 ring-1 ring-slate-300"
};

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
        const res = await voidReissueInvoice(
          actionModal.invoiceId,
          actionReason.trim()
        );
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
          (selectedStatus === "all" || inv.status === selectedStatus) &&
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
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

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
      <section className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Billing</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Invoice Management</h1>
            <p className="mt-2 text-sm text-slate-200">Track draft, active, paid, and corrected invoices with full audit safety.</p>
          </div>

          <button
            onClick={() =>
              openActionModal({
                type: "generate_all",
                title: "Generate Draft Invoices",
                message:
                  "This creates draft invoices for all active clients with billable trips. Continue?",
                confirmLabel: "Generate Drafts",
                requiresReason: false
              })
            }
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Generate Drafts
          </button>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Billed" value={formatCurrency(totalBilled)} tone="slate" />
        <SummaryCard title="Collected" value={formatCurrency(totalCollected)} tone="green" />
        <SummaryCard title="Outstanding" value={formatCurrency(totalOutstanding)} tone="amber" />
        <SummaryCard title="Overdue Invoices" value={overdueCount} tone="red" />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <FilterField label="Search">
            <input
              placeholder="Invoice ID or client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </FilterField>

          <FilterField label="Client">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Status">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FilterField>

          <FilterField label="From Date">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </FilterField>

          <FilterField label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </FilterField>

          <FilterField label="Actions">
            <button
              onClick={resetFilters}
              className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Reset Filters
            </button>
          </FilterField>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="py-20 text-center text-slate-400">No invoices found for selected filters.</div>
        ) : (
          <table className="min-w-full text-left">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-100/90 backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Invoice</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Client</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Created</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Total</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Balance</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedInvoices.map((inv) => {
                const balance = inv.total_amount - inv.amount_paid;
                const canAdjust =
                  ["draft", "pending", "overdue"].includes(inv.status) &&
                  Number(inv.amount_paid || 0) === 0;

                return (
                  <tr key={inv.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">#{inv.id}</td>
                    <td className="px-4 py-3 text-slate-700">{inv.client_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(inv.total_amount)}</td>
                    <td className={`px-4 py-3 font-semibold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[inv.status] || "bg-slate-100 text-slate-700"}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/admin/invoices/${inv.id}`}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
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
                                  "This will lock draft values and set invoice due date. Continue?",
                                confirmLabel: "Confirm Invoice",
                                requiresReason: false
                              })
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
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
                                title: `Void and Reissue #${inv.id}`,
                                message:
                                  "Old invoice will be cancelled and a corrected draft will be generated using latest pricing.",
                                confirmLabel: "Void and Reissue",
                                requiresReason: true
                              })
                            }
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
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
                                  "This will cancel the invoice without reissuing. Provide reason for audit.",
                                confirmLabel: "Cancel Invoice",
                                requiresReason: true
                              })
                            }
                            className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
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
      </section>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                currentPage === i + 1
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700"
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
        <div className="fixed bottom-6 right-6 rounded-xl bg-slate-900 px-6 py-3 text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, tone }) => {
  const toneStyles = {
    slate: "text-slate-900",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700"
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneStyles[tone] || "text-slate-900"}`}>{value}</p>
    </div>
  );
};

const FilterField = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
    {children}
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
    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{message}</p>

      {requiresReason && (
        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reason
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter reason for audit history"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
        >
          Close
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || (requiresReason && reason.trim().length < 3)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Processing..." : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default Invoices;
