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

const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState("");

  const [showPaymentChecklist, setShowPaymentChecklist] = useState(false);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState(0);
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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

  const openPaymentChecklist = () => {
    const amount = validatePaymentAmount();
    if (!amount) return;

    setPendingPaymentAmount(amount);
    setPaymentChecklist({
      pricingReviewed: false,
      amountVerified: false,
      clientVerified: false
    });
    setShowPaymentChecklist(true);
  };

  const submitPayment = async (amount) => {
    try {
      setProcessing(true);
      await recordPayment(invoice.id, amount, user.token);
      showToast("Payment recorded successfully");
      setPaymentAmount("");
      setShowPaymentChecklist(false);
      setPendingPaymentAmount(0);
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

    await submitPayment(pendingPaymentAmount);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <section className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => navigate("/admin/invoices")}
              className="mb-3 rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white transition hover:bg-white/25"
            >
              Back to Invoices
            </button>
            <h1 className="text-2xl font-bold sm:text-3xl">Invoice #{invoice.id}</h1>
            <p className="mt-2 text-sm text-slate-200">
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
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Bill To</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{invoice.client?.name}</p>
              <p>{invoice.client?.email || "-"}</p>
              <p>{invoice.client?.phone || "-"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Container Breakdown</h2>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Container</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Qty</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Price</th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wide text-slate-600">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.container?.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(item.price_snapshot)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Payment History</h2>

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
                      <p className="text-sm font-medium text-slate-900">Payment #{payment.id}</p>
                      <p className="text-xs text-slate-500">{formatLocalDateTime(payment.created_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrency(payment.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
            <h2 className="text-base font-semibold text-slate-900">Payment Summary</h2>

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
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Record Payment</h2>
              <p className="mt-1 text-xs text-slate-500">Use checklist confirmation to avoid incorrect entries.</p>

              <input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <button
                onClick={openPaymentChecklist}
                disabled={processing}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {processing ? "Processing..." : "Review & Confirm Payment"}
              </button>
            </section>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl bg-slate-900 px-6 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {showPaymentChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Payment Checklist</h3>
            <p className="mt-2 text-sm text-slate-600">Invoice #{invoice.id} | Client: {invoice.client?.name}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Payment Amount: {formatCurrency(pendingPaymentAmount)}</p>

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
                onClick={() => setShowPaymentChecklist(false)}
                disabled={processing}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processing || !Object.values(paymentChecklist).every(Boolean)}
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
