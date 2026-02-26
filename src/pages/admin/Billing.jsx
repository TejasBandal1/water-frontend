import { Fragment, useEffect, useState } from "react";
import {
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
  { value: "DKUPI", label: "DKUPI" },
  { value: "UPI", label: "UPI" }
];

const getCurrentMonthValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
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

const Billing = () => {
  const initialMonthFilter = getCurrentMonthValue();
  const [monthFilter, setMonthFilter] = useState(initialMonthFilter);
  const [activePeriod, setActivePeriod] = useState(toMonthParts(initialMonthFilter));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
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
  const [upiAccount, setUpiAccount] = useState("DKUPI");
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

  const loadData = async (override = {}) => {
    const activeMonthFilter = override.monthFilter ?? monthFilter;
    const activeSearch = override.search ?? search;
    const activeMonthParts = toMonthParts(activeMonthFilter);

    if (!activeMonthParts.year || !activeMonthParts.month) return;

    try {
      setLoading(true);
      const res = await getMonthlyBillingSummary(
        activeMonthParts.year,
        activeMonthParts.month,
        activeSearch
      );
      setActivePeriod({
        year: Number(res?.year || activeMonthParts.year),
        month: Number(res?.month || activeMonthParts.month)
      });
      setRows(res?.rows || []);
      setSummary(
        res?.summary || {
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

  const applyFilters = () => {
    loadData();
  };

  const resetFilters = () => {
    const defaultMonth = getCurrentMonthValue();
    setMonthFilter(defaultMonth);
    setSearch("");
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
    setUpiAccount("DKUPI");
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
    setUpiAccount("DKUPI");
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
              Client-wise monthly billing with daily invoice visibility and centralized payment collection.
            </p>
          </div>
        </div>
      </section>

      <section className="panel mb-6 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="form-label">Billing Month</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Search Client</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Client name..."
              className="form-input"
            />
          </div>

          <div className="md:col-span-2">
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
        <SummaryCard title="Clients" value={summary.clients_count} />
        <SummaryCard title="Pending Invoices" value={summary.pending_invoices_count} />
        <SummaryCard
          title="Monthly Bill"
          value={formatCurrency(summary.total_monthly_bill)}
        />
        <SummaryCard
          title="Outstanding"
          value={formatCurrency(summary.total_outstanding)}
          tone="text-amber-700"
        />
      </section>

      <section className="table-shell">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No monthly billing records found for selected filters.</div>
        ) : (
          <table className="table-main">
            <thead>
              <tr>
                <th>Client</th>
                <th>Invoices</th>
                <th>Monthly Bill</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = Boolean(expandedClients[row.client_id]);
                return (
                  <Fragment key={row.client_id}>
                    <tr>
                      <td className="font-semibold text-slate-900">{row.client_name}</td>
                      <td>
                        {row.pending_invoice_count} pending / {row.invoice_count} total
                      </td>
                      <td>{formatCurrency(row.total_monthly_bill)}</td>
                      <td>{formatCurrency(row.total_paid)}</td>
                      <td className="font-semibold text-amber-700">
                        {formatCurrency(row.total_outstanding)}
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
                        <td colSpan={6}>
                          <div className="my-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                              Daily Bill Details
                            </h3>

                            {row.daily_details?.length === 0 ? (
                              <p className="text-sm text-slate-500">No daily details available.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                      <th className="px-2 py-2">Date</th>
                                      <th className="px-2 py-2">Invoices</th>
                                      <th className="px-2 py-2">Billed</th>
                                      <th className="px-2 py-2">Paid</th>
                                      <th className="px-2 py-2">Outstanding</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.daily_details.map((day) => (
                                      <tr key={`${row.client_id}_${day.date}`} className="border-b border-slate-100">
                                        <td className="px-2 py-2">{formatLocalDate(day.date)}</td>
                                        <td className="px-2 py-2">
                                          {day.invoice_count} ({(day.invoice_ids || []).join(", ")})
                                        </td>
                                        <td className="px-2 py-2">{formatCurrency(day.billed_amount)}</td>
                                        <td className="px-2 py-2">{formatCurrency(day.paid_amount)}</td>
                                        <td className="px-2 py-2 font-semibold text-amber-700">
                                          {formatCurrency(day.outstanding_amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Pending Invoices
                            </h4>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(row.pending_invoices || []).length === 0 ? (
                                <span className="text-sm text-slate-500">No pending invoices.</span>
                              ) : (
                                row.pending_invoices.map((inv) => (
                                  <span
                                    key={`pending_${inv.id}`}
                                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    #{inv.id} | {inv.status.toUpperCase()} | {formatCurrency(inv.outstanding_amount)}
                                  </span>
                                ))
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
