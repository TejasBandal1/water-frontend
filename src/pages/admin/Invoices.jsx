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
  partial: "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200",
  paid: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-100 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-slate-200 text-slate-700 ring-1 ring-slate-300"
};

const BILLABLE_STATUSES = ["pending", "partial", "overdue", "paid"];
const OUTSTANDING_STATUSES = ["pending", "partial", "overdue"];

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

  const totalBilled = invoices
    .filter((inv) => BILLABLE_STATUSES.includes((inv.status || "").toLowerCase()))
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const totalCollected = invoices
    .filter((inv) => BILLABLE_STATUSES.includes((inv.status || "").toLowerCase()))
    .reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);

  const totalOutstanding = invoices
    .filter((inv) => OUTSTANDING_STATUSES.includes((inv.status || "").toLowerCase()))
    .reduce(
      (sum, inv) => sum + Math.max(Number(inv.total_amount || 0) - Number(inv.amount_paid || 0), 0),
      0
    );
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
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="page-eyebrow">Billing</p>
            <h1 className="page-title">Invoice Management</h1>
            <p className="page-subtitle">Track draft, active, paid, and corrected invoices with full audit safety.</p>
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
            className="btn-secondary bg-white px-5 py-2.5 text-slate-900 hover:bg-slate-100"
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

      <section className="panel mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <FilterField label="Search">
            <input
              placeholder="Invoice ID or client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </FilterField>

          <FilterField label="Client">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="form-select"
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
              className="form-select"
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
              className="form-input"
            />
          </FilterField>

          <FilterField label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="form-input"
            />
          </FilterField>

          <FilterField label="Actions">
            <button
              onClick={resetFilters}
              className="btn-secondary w-full"
            >
              Reset Filters
            </button>
          </FilterField>
        </div>
      </section>

      <section className="table-shell">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="empty-state">No invoices found for selected filters.</div>
        ) : (
          <table className="table-main">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Created</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedInvoices.map((inv) => {
                const balance = inv.total_amount - inv.amount_paid;
                const canAdjust =
                  ["draft", "pending", "overdue"].includes(inv.status) &&
                  Number(inv.amount_paid || 0) === 0;

                return (
                  <tr key={inv.id}>
                    <td className="font-semibold text-slate-900">#{inv.id}</td>
                    <td>{inv.client_name}</td>
                    <td className="text-slate-600">{formatDate(inv.created_at)}</td>
                    <td className="font-semibold text-slate-800">{formatCurrency(inv.total_amount)}</td>
                    <td className={`font-semibold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[inv.status] || "bg-slate-100 text-slate-700"}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
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
        <div className="toast">
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
    <div className="stat-card">
      <p className="stat-label">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneStyles[tone] || "text-slate-900"}`}>{value}</p>
    </div>
  );
};

const FilterField = ({ label, children }) => (
  <div>
    <label className="form-label">{label}</label>
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
            className="form-textarea"
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
