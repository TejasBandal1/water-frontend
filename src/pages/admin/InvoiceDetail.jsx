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
  { value: "UPI", label: "UPI" }
];

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
    <div className="page-shell">
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
          </div>

          <div className="space-y-2 text-right">
            <span className={`inline-block rounded-full px-4 py-1.5 text-xs font-semibold ${STATUS_STYLES[invoice.status] || "bg-slate-200 text-slate-700"}`}>
              {invoice.status.toUpperCase()}
            </span>
            <p className="text-sm text-slate-200">Due: {invoice.due_date ? formatLocalDate(invoice.due_date) : "Not set"}</p>
          </div>
        </div>
      </section>

      {invoice.status === "overdue" && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          This invoice is overdue. Please review and resolve payment urgently.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="panel p-6">
            <h2 className="section-title">Bill To</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{invoice.client?.name}</p>
              <p>{invoice.client?.email || "-"}</p>
              <p>{invoice.client?.phone || "-"}</p>
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="section-title">Container Breakdown</h2>

            <div className="table-shell mt-4">
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

          <section className="panel p-6">
            <h2 className="section-title">Payment History</h2>

            {payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No payments recorded yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">Payment #{payment.id}</p>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {(payment.method || "CASH").replace("_", " + ")}
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
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrency(payment.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-6 xl:sticky xl:top-6">
            <h2 className="section-title">Payment Summary</h2>

            <div className="mt-4 space-y-3 text-sm">
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
          </section>

          {isPaymentAllowed && (
            <section className="panel p-6">
              <h2 className="section-title">Record Payment</h2>
              <p className="mt-1 text-xs text-slate-500">Use checklist confirmation to avoid incorrect entries.</p>

              <input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="form-input mt-4"
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

                  if (nextMethod === "CASH") {
                    setUpiAccount("DKUPI");
                  }
                }}
                className="form-select mt-3"
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
        <div className="toast">
          {toast}
        </div>
      )}

      {showPaymentChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Payment Checklist</h3>
            <p className="mt-2 text-sm text-slate-600">Invoice #{invoice.id} | Client: {invoice.client?.name}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Payment Amount: {formatCurrency(pendingPaymentPayload?.amount || 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Method: {(pendingPaymentPayload?.method || "CASH").replace("_", " + ")}
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

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPaymentChecklist(false);
                  setPendingPaymentPayload(null);
                }}
                disabled={processing}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processing || !pendingPaymentPayload || !Object.values(paymentChecklist).every(Boolean)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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
