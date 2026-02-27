import { Fragment, useEffect, useMemo, useState } from "react";
import {
  getClients,
  getMonthlyBillingSummary,
  recordMonthlyPayment
} from "../../api/admin";
import { formatLocalDate } from "../../utils/dateTime";

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CASH_UPI", label: "Cash + UPI" }
];

const UPI_ACCOUNT_OPTIONS = [
  { value: "DKPUPI", label: "DKPUPI" },
  { value: "UPI", label: "UPI" }
];

const BILL_STATUS_OPTIONS = [
  { value: "all", label: "All Bills" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" }
];

const getCurrentMonthValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const getMonthLabel = (year, month) => {
  if (!year || !month) return "-";
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric"
  });
};

const toMonthParts = (monthValue) => {
  const [year, month] = String(monthValue || "").split("-");
  return {
    year: Number(year),
    month: Number(month)
  };
};

const getErrorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];

    if (typeof first === "string" && first.trim()) {
      return first;
    }

    if (first && typeof first === "object") {
      const objectMessage = String(first.msg || "").trim();
      if (objectMessage) return objectMessage;
    }
  }

  return fallback;
};

const getCollectionMeta = (percent) => {
  if (percent >= 95) {
    return {
      label: "Fully Collected",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      barClass: "from-emerald-500 to-emerald-600"
    };
  }

  if (percent >= 60) {
    return {
      label: "In Progress",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      barClass: "from-blue-500 to-blue-600"
    };
  }

  return {
    label: "Needs Attention",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    barClass: "from-amber-500 to-amber-600"
  };
};

const Billing = () => {
  const initialMonthFilter = getCurrentMonthValue();
  const [monthFilter, setMonthFilter] = useState(initialMonthFilter);
  const [activePeriod, setActivePeriod] = useState(toMonthParts(initialMonthFilter));
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [billStatusFilter, setBillStatusFilter] = useState("all");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [highlightedClientIndex, setHighlightedClientIndex] = useState(-1);
  const [clientDirectory, setClientDirectory] = useState([]);
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [summary, setSummary] = useState({
    clients_count: 0,
    pending_invoices_count: 0,
    total_monthly_bill: 0,
    total_paid: 0,
    total_outstanding: 0
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [expandedClients, setExpandedClients] = useState({});

  const [paymentModal, setPaymentModal] = useState({
    open: false,
    row: null
  });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashSplitAmount, setCashSplitAmount] = useState("");
  const [upiSplitAmount, setUpiSplitAmount] = useState("");
  const [upiAccount, setUpiAccount] = useState("DKPUPI");
  const [processing, setProcessing] = useState(false);

  const [showChecklist, setShowChecklist] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [checklist, setChecklist] = useState({
    amountVerified: false,
    clientVerified: false,
    monthVerified: false
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  };

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const clientSuggestions = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    const rowMap = new Map((allRows || []).map((row) => [row.client_id, row]));
    const mergedClients = (clientDirectory || []).map((client) => {
      const row = rowMap.get(client.id);
      return {
        client_id: client.id,
        client_name: client.name,
        total_outstanding: row?.total_outstanding || 0
      };
    });
    const source = mergedClients.length > 0 ? mergedClients : (allRows || []);

    const filtered = term
      ? source.filter((row) => row.client_name?.toLowerCase().includes(term))
      : source;

    return filtered.slice(0, 8);
  }, [allRows, clientDirectory, searchInput]);

  const filteredRows = useMemo(() => {
    if (billStatusFilter === "all") return rows;

    return rows.filter((row) => {
      const outstanding = Number(row.total_outstanding || 0);
      if (billStatusFilter === "pending") return outstanding > 0;
      if (billStatusFilter === "completed") return outstanding <= 0;
      return true;
    });
  }, [rows, billStatusFilter]);

  const filteredSummary = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => ({
          clients_count: acc.clients_count + 1,
          pending_invoices_count:
            acc.pending_invoices_count + Number(row.pending_invoice_count || 0),
          total_monthly_bill:
            acc.total_monthly_bill + Number(row.total_monthly_bill || 0),
          total_paid: acc.total_paid + Number(row.total_paid || 0),
          total_outstanding:
            acc.total_outstanding + Number(row.total_outstanding || 0)
        }),
        {
          clients_count: 0,
          pending_invoices_count: 0,
          total_monthly_bill: 0,
          total_paid: 0,
          total_outstanding: 0
        }
      ),
    [filteredRows]
  );

  const summaryToShow =
    billStatusFilter === "all" ? summary : filteredSummary;

  const statusCounts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((row) => Number(row.total_outstanding || 0) > 0).length,
      completed: rows.filter((row) => Number(row.total_outstanding || 0) <= 0).length
    }),
    [rows]
  );

  const loadData = async (override = {}) => {
    const activeMonthFilter = override.monthFilter ?? monthFilter;
    const activeSearch = override.search ?? appliedSearch;
    const activeMonthParts = toMonthParts(activeMonthFilter);

    if (!activeMonthParts.year || !activeMonthParts.month) return;

    try {
      setLoading(true);
      let filteredResponse;
      let allClientsResponse;

      if (activeSearch) {
        [filteredResponse, allClientsResponse] = await Promise.all([
          getMonthlyBillingSummary(
            activeMonthParts.year,
            activeMonthParts.month,
            activeSearch
          ),
          getMonthlyBillingSummary(
            activeMonthParts.year,
            activeMonthParts.month,
            ""
          )
        ]);
      } else {
        filteredResponse = await getMonthlyBillingSummary(
          activeMonthParts.year,
          activeMonthParts.month,
          ""
        );
        allClientsResponse = filteredResponse;
      }

      setActivePeriod({
        year: Number(filteredResponse?.year || activeMonthParts.year),
        month: Number(filteredResponse?.month || activeMonthParts.month)
      });
      setRows(filteredResponse?.rows || []);
      setAllRows(allClientsResponse?.rows || []);
      setSummary(
        filteredResponse?.summary || {
          clients_count: 0,
          pending_invoices_count: 0,
          total_monthly_bill: 0,
          total_paid: 0,
          total_outstanding: 0
        }
      );
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to load monthly billing"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await getClients();
        setClientDirectory(Array.isArray(data) ? data : []);
      } catch {
        setClientDirectory([]);
      }
    };

    fetchClients();
  }, []);

  const applyFilters = () => {
    const term = searchInput.trim();
    setAppliedSearch(term);
    setShowClientDropdown(false);
    setHighlightedClientIndex(-1);
    loadData({ search: term });
  };

  const selectClientFromDropdown = (clientName) => {
    const term = String(clientName || "").trim();
    setSearchInput(term);
    setAppliedSearch(term);
    setShowClientDropdown(false);
    setHighlightedClientIndex(-1);
    loadData({ search: term });
  };

  const resetFilters = () => {
    const defaultMonth = getCurrentMonthValue();
    setMonthFilter(defaultMonth);
    setSearchInput("");
    setAppliedSearch("");
    setBillStatusFilter("all");
    setShowClientDropdown(false);
    setHighlightedClientIndex(-1);
    loadData({ monthFilter: defaultMonth, search: "" });
  };

  const toggleClient = (clientId) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const closePaymentModal = () => {
    if (processing) return;

    setPaymentModal({ open: false, row: null });
    setPaymentAmount("");
    setPaymentMethod("CASH");
    setCashSplitAmount("");
    setUpiSplitAmount("");
    setUpiAccount("DKPUPI");
    setShowChecklist(false);
    setPendingPayload(null);
    setChecklist({
      amountVerified: false,
      clientVerified: false,
      monthVerified: false
    });
  };

  const openPaymentModal = (row) => {
    setPaymentModal({ open: true, row });
    setPaymentAmount(String(Number(row.total_outstanding || 0)));
    setPaymentMethod("CASH");
    setCashSplitAmount("");
    setUpiSplitAmount("");
    setUpiAccount("DKPUPI");
    setShowChecklist(false);
    setPendingPayload(null);
    setChecklist({
      amountVerified: false,
      clientVerified: false,
      monthVerified: false
    });
  };

  const buildPaymentPayload = () => {
    const row = paymentModal.row;
    const amount = Number(paymentAmount);
    const outstanding = Number(row?.total_outstanding || 0);

    if (!row) return null;

    if (!amount || amount <= 0) {
      showToast("Enter valid payment amount");
      return null;
    }

    if (amount > outstanding) {
      showToast("Payment exceeds monthly outstanding amount");
      return null;
    }

    const payload = {
      client_id: row.client_id,
      year: activePeriod.year,
      month: activePeriod.month,
      amount,
      method: paymentMethod
    };

    if (paymentMethod === "UPI") {
      if (!upiAccount) {
        showToast("Select UPI account");
        return null;
      }
      payload.upi_account = upiAccount;
    }

    if (paymentMethod === "CASH_UPI") {
      const cash = Number(cashSplitAmount);
      const upi = Number(upiSplitAmount);

      if (!cash || cash <= 0 || !upi || upi <= 0) {
        showToast("Enter valid cash and UPI split amounts");
        return null;
      }

      if (Number((cash + upi).toFixed(2)) !== Number(amount.toFixed(2))) {
        showToast("Cash + UPI split must equal payment amount");
        return null;
      }

      if (!upiAccount) {
        showToast("Select UPI account");
        return null;
      }

      payload.cash_amount = cash;
      payload.upi_amount = upi;
      payload.upi_account = upiAccount;
    }

    return payload;
  };

  const openChecklist = () => {
    const payload = buildPaymentPayload();
    if (!payload) return;

    setPendingPayload(payload);
    setChecklist({
      amountVerified: false,
      clientVerified: false,
      monthVerified: false
    });
    setShowChecklist(true);
  };

  const confirmMonthlyPayment = async () => {
    if (!pendingPayload) return;

    const allChecked = Object.values(checklist).every(Boolean);
    if (!allChecked) {
      showToast("Complete checklist before confirming payment");
      return;
    }

    try {
      setProcessing(true);
      await recordMonthlyPayment(pendingPayload);
      showToast("Monthly payment recorded successfully");
      closePaymentModal();
      loadData();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to record monthly payment"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-eyebrow">Billing</p>
            <h1 className="page-title">Monthly Billing</h1>
            <p className="page-subtitle">
              Monthly totals are shown in full detail. Daily bills stay compact for quick verification only.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right text-xs text-slate-100">
            <p className="font-semibold uppercase tracking-wide text-slate-200">Selected Period</p>
            <p className="mt-1 text-sm font-bold text-white">
              {getMonthLabel(activePeriod.year, activePeriod.month)}
            </p>
          </div>
        </div>
      </section>

      <section className="panel mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          <div>
            <label className="form-label">Billing Month</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="md:col-span-3">
            <label className="form-label">Search Client</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={searchInput}
                onFocus={() => {
                  setShowClientDropdown(true);
                  setHighlightedClientIndex(-1);
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowClientDropdown(false), 120);
                }}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowClientDropdown(true);
                  setHighlightedClientIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (!showClientDropdown) {
                      setShowClientDropdown(true);
                      return;
                    }
                    setHighlightedClientIndex((prev) =>
                      Math.min(prev + 1, Math.max(clientSuggestions.length - 1, 0))
                    );
                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedClientIndex((prev) => Math.max(prev - 1, -1));
                    return;
                  }

                  if (e.key === "Enter") {
                    if (showClientDropdown && highlightedClientIndex >= 0) {
                      const selected = clientSuggestions[highlightedClientIndex];
                      if (selected) {
                        selectClientFromDropdown(selected.client_name);
                        return;
                      }
                    }
                    applyFilters();
                    return;
                  }

                  if (e.key === "Escape") {
                    setShowClientDropdown(false);
                    setHighlightedClientIndex(-1);
                  }
                }}
                placeholder="Type client name..."
                className="form-input pl-10 pr-20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setAppliedSearch("");
                    setShowClientDropdown(false);
                    setHighlightedClientIndex(-1);
                    loadData({ search: "" });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              )}

              {showClientDropdown && (
                <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {clientSuggestions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No clients found for selected month.</p>
                  ) : (
                    clientSuggestions.map((client, index) => (
                      <button
                        key={client.client_id}
                        type="button"
                        onMouseDown={() => {
                          selectClientFromDropdown(client.client_name);
                        }}
                        className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                          highlightedClientIndex === index
                            ? "bg-slate-100"
                            : ""
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{client.client_name}</p>
                        <p className="text-xs text-slate-500">
                          Outstanding: {formatCurrency(client.total_outstanding || 0)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="form-label">Bill Status</label>
            <div className="md:hidden">
              <select
                value={billStatusFilter}
                onChange={(e) => setBillStatusFilter(e.target.value)}
                className="form-select"
              >
                {BILL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden flex-wrap gap-2 md:flex">
              {BILL_STATUS_OPTIONS.map((option) => {
                const isActive = billStatusFilter === option.value;
                const count = statusCounts[option.value] ?? 0;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBillStatusFilter(option.value)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="form-label">Actions</label>
            <div className="flex gap-3">
              <button onClick={applyFilters} className="btn-primary">
                Apply
              </button>
              <button onClick={resetFilters} className="btn-secondary">
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Clients" value={summaryToShow.clients_count} />
        <SummaryCard title="Pending Invoices" value={summaryToShow.pending_invoices_count} />
        <SummaryCard
          title="Monthly Bill"
          value={formatCurrency(summaryToShow.total_monthly_bill)}
        />
        <SummaryCard
          title="Outstanding"
          value={formatCurrency(summaryToShow.total_outstanding)}
          tone="text-amber-700"
        />
      </section>

      <section className="table-shell">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="empty-state">
            No {billStatusFilter === "all" ? "" : `${billStatusFilter} `}billing records found for selected filters.
          </div>
        ) : (
          <table className="table-main">
            <thead>
              <tr>
                <th>Client & Cycle</th>
                <th>Monthly Ledger</th>
                <th>Collection Status</th>
                <th>Pending Queue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const expanded = Boolean(expandedClients[row.client_id]);
                const monthlyBill = Number(row.total_monthly_bill || 0);
                const totalPaid = Number(row.total_paid || 0);
                const totalOutstanding = Number(row.total_outstanding || 0);
                const collectedPercent =
                  monthlyBill > 0
                    ? Math.min(Math.round((totalPaid / monthlyBill) * 100), 100)
                    : 0;
                const collectionMeta = getCollectionMeta(collectedPercent);

                return (
                  <Fragment key={row.client_id}>
                    <tr>
                      <td>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{row.client_name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {getMonthLabel(activePeriod.year, activePeriod.month)}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${collectionMeta.badgeClass}`}>
                              {collectionMeta.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="grid min-w-[260px] grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                          <p className="text-slate-500">Total Invoices</p>
                          <p className="text-right font-semibold text-slate-900">{row.invoice_count}</p>
                          <p className="text-slate-500">Pending Invoices</p>
                          <p className="text-right font-semibold text-amber-700">{row.pending_invoice_count}</p>
                          <p className="text-slate-500">Monthly Bill</p>
                          <p className="text-right font-semibold text-slate-900">
                            {formatCurrency(row.total_monthly_bill)}
                          </p>
                          <p className="text-slate-500">Collected</p>
                          <p className="text-right font-semibold text-emerald-700">
                            {formatCurrency(row.total_paid)}
                          </p>
                          <p className="text-slate-500">Outstanding</p>
                          <p className="text-right font-semibold text-amber-700">
                            {formatCurrency(row.total_outstanding)}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="min-w-[220px]">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                              {collectedPercent}% collected
                            </span>
                            <span className="text-slate-500">
                              {formatCurrency(totalPaid)} / {formatCurrency(monthlyBill)}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r transition-all ${collectionMeta.barClass}`}
                              style={{ width: `${collectedPercent}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Pending: {formatCurrency(totalOutstanding)}
                          </p>
                        </div>
                      </td>
                      <td className="max-w-xs">
                        {(row.pending_invoices || []).length === 0 ? (
                          <span className="text-xs text-slate-500">No pending invoices</span>
                        ) : (
                          <div className="space-y-1.5">
                            {row.pending_invoices.slice(0, 3).map((inv) => (
                              <div
                                key={`pending_preview_${inv.id}`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                              >
                                <span className="font-semibold">#{inv.id}</span>
                                <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 uppercase text-[10px] font-semibold text-slate-600">
                                  {inv.status}
                                </span>
                                <span className="ml-2 font-semibold">
                                  {formatCurrency(inv.outstanding_amount)}
                                </span>
                              </div>
                            ))}
                            {(row.pending_invoices || []).length > 3 && (
                              <p className="text-[11px] font-semibold text-slate-500">
                                +{row.pending_invoices.length - 3} more in details
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleClient(row.client_id)}
                            className="btn-secondary px-3 py-1.5"
                          >
                            {expanded ? "Hide Details" : "Daily Details"}
                          </button>
                          <button
                            onClick={() => openPaymentModal(row)}
                            disabled={Number(row.total_outstanding || 0) <= 0}
                            className="btn-primary px-3 py-1.5 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            Collect Monthly Payment
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr key={`${row.client_id}_details`}>
                        <td colSpan={5}>
                          <div className="my-2 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-3">
                            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                                  Monthly Billing Detail
                                </h3>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                  {getMonthLabel(activePeriod.year, activePeriod.month)}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <DetailMetric
                                  label="Invoices"
                                  value={row.invoice_count}
                                  tone="text-slate-900"
                                />
                                <DetailMetric
                                  label="Pending"
                                  value={row.pending_invoice_count}
                                  tone="text-amber-700"
                                />
                                <DetailMetric
                                  label="Collected"
                                  value={formatCurrency(row.total_paid)}
                                  tone="text-emerald-700"
                                />
                                <DetailMetric
                                  label="Outstanding"
                                  value={formatCurrency(row.total_outstanding)}
                                  tone="text-amber-700"
                                />
                              </div>

                              <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Pending Invoice Queue
                              </h4>
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {(row.pending_invoices || []).length === 0 ? (
                                  <span className="text-sm text-slate-500">No pending invoices.</span>
                                ) : (
                                  row.pending_invoices.map((inv) => (
                                    <div
                                      key={`pending_${inv.id}`}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                    >
                                      <p className="text-xs font-semibold text-slate-900">
                                        Invoice #{inv.id}
                                      </p>
                                      <div className="mt-1 flex items-center justify-between">
                                        <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                          {inv.status}
                                        </span>
                                        <p className="text-sm font-bold text-amber-700">
                                          {formatCurrency(inv.outstanding_amount)}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                                Daily Bills (Compact)
                              </h3>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Small snapshot for daily checks. Monthly billing above is the primary record.
                              </p>

                              {row.daily_details?.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-500">No daily details available.</p>
                              ) : (
                                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                                  <div className="grid grid-cols-4 gap-2 border-b border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    <span>Date</span>
                                    <span className="text-right">Billed</span>
                                    <span className="text-right">Paid</span>
                                    <span className="text-right">Balance</span>
                                  </div>
                                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto bg-white">
                                    {row.daily_details.map((day) => (
                                      <div
                                        key={`${row.client_id}_${day.date}`}
                                        className="grid grid-cols-4 gap-2 px-2 py-2 text-[11px]"
                                      >
                                        <div>
                                          <p className="font-semibold text-slate-800">{formatLocalDate(day.date)}</p>
                                          <p className="text-[10px] text-slate-500">{day.invoice_count} inv</p>
                                        </div>
                                        <p className="text-right font-semibold text-slate-700">
                                          {formatCurrency(day.billed_amount)}
                                        </p>
                                        <p className="text-right font-semibold text-emerald-700">
                                          {formatCurrency(day.paid_amount)}
                                        </p>
                                        <p className="text-right font-semibold text-amber-700">
                                          {formatCurrency(day.outstanding_amount)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Record Monthly Payment</h3>
            <p className="mt-2 text-sm text-slate-600">
              Client: <span className="font-semibold text-slate-900">{paymentModal.row?.client_name}</span> | Month:{" "}
              <span className="font-semibold text-slate-900">
                {activePeriod.year}-{String(activePeriod.month).padStart(2, "0")}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Outstanding: {formatCurrency(paymentModal.row?.total_outstanding || 0)}
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="form-input"
              />

              <select
                value={paymentMethod}
                onChange={(e) => {
                  const nextMethod = e.target.value;
                  setPaymentMethod(nextMethod);

                  if (nextMethod !== "CASH_UPI") {
                    setCashSplitAmount("");
                    setUpiSplitAmount("");
                  }
                }}
                className="form-select"
              >
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>

              {paymentMethod === "CASH_UPI" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="number"
                    value={cashSplitAmount}
                    onChange={(e) => setCashSplitAmount(e.target.value)}
                    placeholder="Cash amount"
                    className="form-input"
                  />
                  <input
                    type="number"
                    value={upiSplitAmount}
                    onChange={(e) => setUpiSplitAmount(e.target.value)}
                    placeholder="UPI amount"
                    className="form-input"
                  />
                </div>
              )}

              {paymentMethod !== "CASH" && (
                <select
                  value={upiAccount}
                  onChange={(e) => setUpiAccount(e.target.value)}
                  className="form-select"
                >
                  {UPI_ACCOUNT_OPTIONS.map((account) => (
                    <option key={account.value} value={account.value}>
                      {account.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {showChecklist && (
              <div className="mt-5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Confirm Checklist</p>
                <ChecklistItem
                  label="I verified the payment amount."
                  checked={checklist.amountVerified}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, amountVerified: checked }))
                  }
                />
                <ChecklistItem
                  label="I verified the client details."
                  checked={checklist.clientVerified}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, clientVerified: checked }))
                  }
                />
                <ChecklistItem
                  label="I verified the selected billing month."
                  checked={checklist.monthVerified}
                  onChange={(checked) =>
                    setChecklist((prev) => ({ ...prev, monthVerified: checked }))
                  }
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closePaymentModal}
                disabled={processing}
                className="btn-secondary"
              >
                Close
              </button>

              {!showChecklist ? (
                <button onClick={openChecklist} className="btn-primary">
                  Review Payment
                </button>
              ) : (
                <button
                  onClick={confirmMonthlyPayment}
                  disabled={
                    processing || !pendingPayload || !Object.values(checklist).every(Boolean)
                  }
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400"
                >
                  {processing ? "Processing..." : "Confirm Payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

const SummaryCard = ({ title, value, tone = "text-slate-900" }) => (
  <div className="stat-card">
    <p className="stat-label">{title}</p>
    <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
  </div>
);

const DetailMetric = ({ label, value, tone = "text-slate-900" }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-sm font-bold ${tone}`}>{value}</p>
  </div>
);

const ChecklistItem = ({ label, checked, onChange }) => (
  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-slate-300"
    />
    <span>{label}</span>
  </label>
);

export default Billing;
