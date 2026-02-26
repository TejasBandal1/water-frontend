import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInvoiceDetail } from "../../api/billing";
import { recordPayment } from "../../api/payments";
import { AuthContext } from "../../context/AuthContext";
import { formatLocalDate, formatLocalDateTime } from "../../utils/dateTime";

const STATUS_STYLES = {
  draft: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  pending: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  partial: "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
  paid: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  overdue: "bg-red-100 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-slate-200 text-slate-700 ring-1 ring-slate-300"
};

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CASH_UPI", label: "Cash + UPI" }
];

const UPI_ACCOUNT_OPTIONS = [
  { value: "DKUPI", label: "DKUPI" },
  { value: "RIVA_RICH", label: "Riva Rich" }
];

const PAYMENT_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" }
];

const formatMethodLabel = (method) =>
  String(method || "CASH").replace("_", " + ");

const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashSplitAmount, setCashSplitAmount] = useState("");
  const [upiSplitAmount, setUpiSplitAmount] = useState("");
  const [upiAccount, setUpiAccount] = useState("DKUPI");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const [showPaymentChecklist, setShowPaymentChecklist] = useState(false);
  const [pendingPaymentPayload, setPendingPaymentPayload] = useState(null);
  const [paymentChecklist, setPaymentChecklist] = useState({
    pricingReviewed: false,
    amountVerified: false,
    clientVerified: false
  });
  const progressTone = useMemo(() => {
    if (!data) return "bg-amber-500";

    const total = Number(data.invoice?.total_amount || 0);
    const paid = Number(data.invoice?.amount_paid || 0);
    const progressValue = total > 0 ? (paid / total) * 100 : 0;

    if (progressValue >= 100) return "bg-emerald-500";
    if (progressValue >= 50) return "bg-blue-500";
    return "bg-amber-500";
  }, [data]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getInvoiceDetail(invoiceId, user.token);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  if (!data) return null;

  const { invoice, items, payments } = data;
  const balance = Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0);

  const progress =
    Number(invoice.total_amount || 0) > 0
      ? (Number(invoice.amount_paid || 0) / Number(invoice.total_amount || 0)) * 100
      : 0;

  const isPaymentAllowed = invoice.status !== "paid" && user.role === "admin";
  const clientName = invoice.client?.name || "Client";
  const clientInitial = clientName.charAt(0).toUpperCase();
  const paymentsWithState = useMemo(() => {
    const total = Number(invoice.total_amount || 0);
    const ascending = [...payments].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    let runningPaid = 0;
    const stateById = {};

    ascending.forEach((payment) => {
      runningPaid = Number((runningPaid + Number(payment.amount || 0)).toFixed(2));
      const remaining = Number((total - runningPaid).toFixed(2));
      stateById[payment.id] = remaining <= 0 ? "completed" : "pending";
    });

    return payments.map((payment) => ({
      ...payment,
      payment_state:
        stateById[payment.id] || (invoice.status === "paid" ? "completed" : "pending")
    }));
  }, [payments, invoice.total_amount, invoice.status]);

  const paymentCounts = useMemo(() => {
    const completed = paymentsWithState.filter(
      (payment) => payment.payment_state === "completed"
    ).length;
    const pending = paymentsWithState.filter(
      (payment) => payment.payment_state === "pending"
    ).length;

    return {
      all: paymentsWithState.length,
      completed,
      pending
    };
  }, [paymentsWithState]);

  const filteredPayments = useMemo(() => {
    if (paymentFilter === "all") return paymentsWithState;
    return paymentsWithState.filter((payment) => payment.payment_state === paymentFilter);
  }, [paymentsWithState, paymentFilter]);

  const validatePaymentAmount = () => {
    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      showToast("Enter valid payment amount");
      return null;
    }

    if (amount > balance) {
      showToast("Payment exceeds remaining balance");
      return null;
    }

    return amount;
  };

  const buildPaymentPayload = () => {
    const amount = validatePaymentAmount();
    if (!amount) return null;

    const payload = {
      amount,
      method: paymentMethod
    };

    if (paymentMethod === "UPI") {
      const account = upiAccount;
      if (!account) {
        showToast("Select UPI account");
        return null;
      }
      payload.upi_account = account;
    }

    if (paymentMethod === "CASH_UPI") {
      const cash = Number(cashSplitAmount);
      const upi = Number(upiSplitAmount);

      if (!cash || cash <= 0 || !upi || upi <= 0) {
        showToast("Enter valid cash and UPI split amounts");
        return null;
      }

      const splitTotal = Number((cash + upi).toFixed(2));
      if (splitTotal !== Number(amount.toFixed(2))) {
        showToast("Cash + UPI split must match total payment amount");
        return null;
      }

      const account = upiAccount;
      if (!account) {
        showToast("Select UPI account");
        return null;
      }

      payload.cash_amount = cash;
      payload.upi_amount = upi;
      payload.upi_account = account;
    }

    return payload;
  };

  const openPaymentChecklist = () => {
    const payload = buildPaymentPayload();
    if (!payload) return;

    setPendingPaymentPayload(payload);
    setPaymentChecklist({
      pricingReviewed: false,
      amountVerified: false,
      clientVerified: false
    });
    setShowPaymentChecklist(true);
  };

  const submitPayment = async (payload) => {
    try {
      setProcessing(true);
      await recordPayment(invoice.id, payload, user.token);
      showToast("Payment recorded successfully");
      setPaymentAmount("");
      setPaymentMethod("CASH");
      setCashSplitAmount("");
      setUpiSplitAmount("");
      setUpiAccount("DKUPI");
      setShowPaymentChecklist(false);
      setPendingPaymentPayload(null);
      fetchData();
    } catch {
      showToast("Failed to record payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    const allChecked = Object.values(paymentChecklist).every(Boolean);
    if (!allChecked) {
      showToast("Please complete all checklist items before confirming payment");
      return;
    }

    await submitPayment(pendingPaymentPayload);
  };

  return (
    <div className="page-shell mx-auto w-full max-w-[1480px]">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => navigate("/admin/invoices")}
              className="mb-3 rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white transition hover:bg-white/20"
            >
              Back to Invoices
            </button>
            <h1 className="page-title">Invoice #{invoice.id}</h1>
            <p className="page-subtitle">
              Created on {formatLocalDate(invoice.created_at)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              Client: {clientName}
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left shadow-[0_8px_22px_rgba(2,6,23,0.28)] sm:text-right">
            <span className={`inline-block rounded-full px-4 py-1.5 text-xs font-semibold ${STATUS_STYLES[invoice.status] || "bg-slate-200 text-slate-700"}`}>
              {invoice.status.toUpperCase()}
            </span>
            <p className="text-sm text-slate-200">
              Due: {invoice.due_date ? formatLocalDate(invoice.due_date) : "Not set"}
            </p>
          </div>
        </div>
      </section>

      {invoice.status === "overdue" && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          This invoice is overdue. Please review and resolve payment urgently.
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:hidden">
        <CompactStat
          label="Total Bill"
          value={formatCurrency(invoice.total_amount)}
          tone="text-slate-900"
        />
        <CompactStat
          label="Paid"
          value={formatCurrency(invoice.amount_paid)}
          tone="text-emerald-700"
        />
        <CompactStat
          label="Balance"
          value={formatCurrency(balance)}
          tone={balance > 0 ? "text-amber-700" : "text-emerald-700"}
        />
        <CompactStat
          label="Progress"
          value={`${progress.toFixed(0)}%`}
          tone="text-blue-700"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-8">
          <section className="panel p-4 sm:p-6">
            <h2 className="section-title">Bill To</h2>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {clientInitial}
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">{clientName}</p>
                <p className="mt-1 text-xs text-slate-500">Client Account</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                Email: {invoice.client?.email || "-"}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                Phone: {invoice.client?.phone || "-"}
              </span>
            </div>
          </section>

          <section className="panel p-4 sm:p-6">
            <h2 className="section-title">Container Breakdown</h2>

            <div className="mt-4 space-y-3 md:hidden">
              {items.map((item) => (
                <div
                  key={`mobile_item_${item.id}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-[0_5px_16px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.container?.name}</p>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      Qty {item.quantity}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Unit Price</p>
                      <p className="font-semibold text-slate-800">{formatCurrency(item.price_snapshot)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Total</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="table-shell mt-4 hidden md:block">
              <table className="table-main">
                <thead>
                  <tr>
                    <th>Container</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="text-sm font-medium text-slate-900">{item.container?.name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price_snapshot)}</td>
                      <td className="font-semibold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="section-title">Payment History</h2>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_FILTER_OPTIONS.map((option) => {
                  const active = paymentFilter === option.value;
                  const count = paymentCounts[option.value] ?? 0;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentFilter(option.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentsWithState.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No payments recorded yet.</p>
            ) : filteredPayments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No {paymentFilter} payments for this invoice.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-[0_5px_16px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">Payment #{payment.id}</p>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {formatMethodLabel(payment.method)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            payment.payment_state === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {String(payment.payment_state).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{formatLocalDateTime(payment.created_at)}</p>
                      {(payment.method || "CASH") !== "CASH" && (
                        <p className="text-xs text-slate-500">
                          UPI Account: {payment.upi_account || "-"}
                        </p>
                      )}
                      {(payment.method || "CASH") === "CASH_UPI" && (
                        <p className="text-xs text-slate-500">
                          Cash: {formatCurrency(payment.cash_amount || 0)} | UPI: {formatCurrency(payment.upi_amount || 0)}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-emerald-700 sm:text-right">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="order-1 space-y-6 lg:order-2 lg:col-span-4">
          <section className="panel overflow-hidden lg:sticky lg:top-6">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-4 text-white">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Payment Summary</h2>
              <p className="mt-1 text-xs text-slate-300">Invoice #{invoice.id}</p>
            </div>

            <div className="p-5">
              <div className="space-y-3 text-sm">
                <Row label="Total" value={formatCurrency(invoice.total_amount)} />
                <Row label="Paid" value={formatCurrency(invoice.amount_paid)} />
                <Row
                  label="Balance"
                  value={formatCurrency(balance)}
                  valueClass={balance > 0 ? "text-red-600" : "text-emerald-600"}
                />
              </div>

              <div className="mt-5">
                <div className="h-2.5 w-full rounded-full bg-slate-200">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${progressTone}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{progress.toFixed(0)}% Paid</p>
              </div>
            </div>
          </section>

          {isPaymentAllowed && (
            <section className="panel p-4 sm:p-6">
              <h2 className="section-title">Record Payment</h2>
              <p className="mt-1 text-xs text-slate-500">Use checklist confirmation to avoid incorrect entries.</p>

              <label className="form-label mt-4">Amount</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="form-input"
              />

              <label className="form-label mt-3">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const nextMethod = e.target.value;
                  setPaymentMethod(nextMethod);

                  if (nextMethod !== "CASH_UPI") {
                    setCashSplitAmount("");
                    setUpiSplitAmount("");
                  }

                  if (nextMethod === "CASH") {
                    setUpiAccount("DKUPI");
                  }
                }}
                className="form-select"
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {paymentMethod === "CASH_UPI" && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="number"
                    placeholder="Cash amount"
                    value={cashSplitAmount}
                    onChange={(e) => setCashSplitAmount(e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="number"
                    placeholder="UPI amount"
                    value={upiSplitAmount}
                    onChange={(e) => setUpiSplitAmount(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}

              {paymentMethod !== "CASH" && (
                <div className="mt-3 space-y-3">
                  <label className="form-label">UPI Account</label>
                  <select
                    value={upiAccount}
                    onChange={(e) => setUpiAccount(e.target.value)}
                    className="form-select"
                  >
                    {UPI_ACCOUNT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={openPaymentChecklist}
                disabled={processing}
                className="btn-primary mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {processing ? "Processing..." : "Review & Confirm Payment"}
              </button>
            </section>
          )}
        </div>
      </div>

      {toast && (
        <div className="toast left-4 right-4 sm:left-auto sm:right-6">
          {toast}
        </div>
      )}

      {showPaymentChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Payment Checklist</h3>
            <p className="mt-2 text-sm text-slate-600">Invoice #{invoice.id} | Client: {invoice.client?.name}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Payment Amount: {formatCurrency(pendingPaymentPayload?.amount || 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Method: {formatMethodLabel(pendingPaymentPayload?.method)}
            </p>
            {pendingPaymentPayload?.method === "CASH_UPI" && (
              <p className="mt-1 text-xs text-slate-500">
                Cash: {formatCurrency(pendingPaymentPayload.cash_amount || 0)} | UPI: {formatCurrency(pendingPaymentPayload.upi_amount || 0)}
              </p>
            )}
            {pendingPaymentPayload?.method !== "CASH" && (
              <p className="mt-1 text-xs text-slate-500">
                UPI Account: {pendingPaymentPayload?.upi_account || "-"}
              </p>
            )}

            <div className="mt-5 space-y-3">
              <ChecklistItem
                label="I verified invoice pricing and totals are correct."
                checked={paymentChecklist.pricingReviewed}
                onChange={(checked) =>
                  setPaymentChecklist((prev) => ({ ...prev, pricingReviewed: checked }))
                }
              />
              <ChecklistItem
                label="I verified payment amount entered is correct."
                checked={paymentChecklist.amountVerified}
                onChange={(checked) =>
                  setPaymentChecklist((prev) => ({ ...prev, amountVerified: checked }))
                }
              />
              <ChecklistItem
                label="I verified client and invoice details before posting payment."
                checked={paymentChecklist.clientVerified}
                onChange={(checked) =>
                  setPaymentChecklist((prev) => ({ ...prev, clientVerified: checked }))
                }
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setShowPaymentChecklist(false);
                  setPendingPaymentPayload(null);
                }}
                disabled={processing}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processing || !pendingPaymentPayload || !Object.values(paymentChecklist).every(Boolean)}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                {processing ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, valueClass = "text-slate-900" }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold ${valueClass}`}>{value}</span>
  </div>
);

const CompactStat = ({ label, value, tone = "text-slate-900" }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-base font-bold ${tone}`}>{value}</p>
  </div>
);

const ChecklistItem = ({ label, checked, onChange }) => (
  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-slate-300"
    />
    <span>{label}</span>
  </label>
);

export default InvoiceDetail;
