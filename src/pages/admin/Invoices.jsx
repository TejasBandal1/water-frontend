import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelInvoice,
  confirmInvoice,
  deleteInvoice,
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

const DEFAULT_PAGE_SIZE = 8;
const PAGE_SIZE_OPTIONS = [8, 20, 50, 100];

const getPaginationTokens = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const tokens = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) tokens.push("left-ellipsis");

  for (let page = start; page <= end; page += 1) {
    tokens.push(page);
  }

  if (end < totalPages - 1) tokens.push("right-ellipsis");

  tokens.push(totalPages);
  return tokens;
};

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageInput, setPageInput] = useState("");
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

      if (actionModal.type === "delete") {
        await deleteInvoice(actionModal.invoiceId);
        showToast(`Invoice #${actionModal.invoiceId} deleted`);
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
        const driverSearchText = [
          inv.driver_name || "",
          ...(Array.isArray(inv.driver_names) ? inv.driver_names : [])
        ]
          .join(" ")
          .toLowerCase();
        const searchValue = searchTerm.toLowerCase();

        return (
          (clientName.includes(searchValue) ||
            driverSearchText.includes(searchValue) ||
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

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClient, selectedStatus, fromDate, toDate, pageSize]);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const firstItemIndex = filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItemIndex = Math.min(currentPage * pageSize, filteredInvoices.length);
  const paginationTokens = useMemo(
    () => getPaginationTokens(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const goToPage = (page) => {
    if (!totalPages) return;
    const target = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(target);
  };

  const submitPageJump = (e) => {
    e.preventDefault();
    const target = Number(pageInput);
    if (!target || Number.isNaN(target)) return;
    goToPage(target);
    setPageInput("");
  };

  return (
    <div className={`page-shell ${totalPages > 1 ? "pb-4 md:pb-0" : ""}`}>
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
              placeholder="Invoice ID, client, or driver"
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
            <div className="flex flex-col gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="form-select"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <button
                onClick={resetFilters}
                className="btn-secondary w-full"
              >
                Reset Filters
              </button>
            </div>
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
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-medium text-slate-600 sm:text-sm">
              <span>
                Showing {firstItemIndex}-{lastItemIndex} of {filteredInvoices.length} invoices
              </span>
              <span>
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>
            </div>

            <div className="space-y-3 md:hidden">
              {paginatedInvoices.map((inv) => {
                const balance = inv.total_amount - inv.amount_paid;
                const canAdjust =
                  ["draft", "pending", "overdue"].includes(inv.status) &&
                  Number(inv.amount_paid || 0) === 0;
                const canDeleteInvoice =
                  ["draft", "pending", "overdue", "cancelled"].includes(inv.status) &&
                  Number(inv.amount_paid || 0) === 0;
                const driverNames = Array.isArray(inv.driver_names) ? inv.driver_names : [];
                const driverLabel = inv.driver_name
                  || (driverNames.length === 1 ? driverNames[0] : null)
                  || (driverNames.length > 1 ? `Multiple (${driverNames.length})` : "Unassigned");

                return (
                  <div key={`mobile_${inv.id}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Invoice #{inv.id}</p>
                        <p className="text-xs text-slate-500">{formatDate(inv.created_at)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[inv.status] || "bg-slate-100 text-slate-700"}`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Client</p>
                        <p className="font-semibold text-slate-800">{inv.client_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Driver</p>
                        <p className="font-semibold text-slate-800">{driverLabel}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(inv.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Balance</p>
                        <p className={`font-semibold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        to={`/admin/invoices/${inv.id}`}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-blue-700"
                      >
                        View
                      </Link>

                      {canDeleteInvoice && (
                        <button
                          onClick={() =>
                            openActionModal({
                              type: "delete",
                              invoiceId: inv.id,
                              title: `Delete Invoice #${inv.id}`,
                              message:
                                "This will permanently delete this invoice and remove linked trip entries. Billing and delivery totals will be recalculated.",
                              confirmLabel: "Delete Invoice",
                              requiresReason: false
                            })
                          }
                          className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      )}

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
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
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
                          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
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
                          className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <table className="table-main hidden md:table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Driver</th>
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
                  const canDeleteInvoice =
                    ["draft", "pending", "overdue", "cancelled"].includes(inv.status) &&
                    Number(inv.amount_paid || 0) === 0;
                  const driverNames = Array.isArray(inv.driver_names) ? inv.driver_names : [];
                  const driverLabel = inv.driver_name
                    || (driverNames.length === 1 ? driverNames[0] : null)
                    || (driverNames.length > 1 ? `Multiple (${driverNames.length})` : "Unassigned");

                  return (
                    <tr key={inv.id}>
                      <td className="font-semibold text-slate-900">#{inv.id}</td>
                      <td>{inv.client_name}</td>
                      <td>{driverLabel}</td>
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

                          {canDeleteInvoice && (
                            <button
                              onClick={() =>
                                openActionModal({
                                  type: "delete",
                                  invoiceId: inv.id,
                                  title: `Delete Invoice #${inv.id}`,
                                  message:
                                    "This will permanently delete this invoice and remove linked trip entries. Billing and delivery totals will be recalculated.",
                                  confirmLabel: "Delete Invoice",
                                  requiresReason: false
                                })
                              }
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                            >
                              Delete
                            </button>
                          )}

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
          </>
        )}
      </section>

      {totalPages > 1 && (
        <div className="mt-6 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)] md:block">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                First
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {paginationTokens.map((token) =>
                typeof token === "number" ? (
                  <button
                    key={`page_${token}`}
                    onClick={() => goToPage(token)}
                    className={`min-w-[34px] rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                      currentPage === token
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {token}
                  </button>
                ) : (
                  <span key={token} className="px-1 text-slate-500">...</span>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>

          <form onSubmit={submitPageJump} className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
            <span>Go to page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-xs"
              placeholder={`${currentPage}`}
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Go
            </button>
          </form>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
          <div className="sticky bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                First
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>

              <div className="min-w-[90px] text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Page</p>
                <p className="text-sm font-bold text-slate-900">{currentPage} / {totalPages}</p>
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Last
              </button>
            </div>

            <form onSubmit={submitPageJump} className="mt-2 grid grid-cols-3 gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={`mobile_size_${size}`} value={size}>
                    {size}/page
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-center text-[11px]"
                placeholder={`Go ${currentPage}`}
              />

              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-white"
              >
                Jump
              </button>
            </form>
          </div>
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
