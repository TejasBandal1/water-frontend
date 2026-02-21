import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getInvoiceDetail } from "../../api/billing";
import { recordPayment } from "../../api/payments";
import { formatLocalDate } from "../../utils/dateTime";

const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState("");

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

  const formatCurrency = (v) =>
    `₹ ${Number(v || 0).toLocaleString("en-IN")}`;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  if (!data) return null;

  const { invoice, items, payments } = data;
  const balance = invoice.total_amount - invoice.amount_paid;

  const progress =
    invoice.total_amount > 0
      ? (invoice.amount_paid / invoice.total_amount) * 100
      : 0;

  const handlePayment = async () => {
    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      showToast("Enter valid payment amount");
      return;
    }

    if (amount > balance) {
      showToast("Payment exceeds remaining balance");
      return;
    }

    try {
      setProcessing(true);
      await recordPayment(invoice.id, amount, user.token);
      showToast("Payment recorded successfully");
      setPaymentAmount("");
      fetchData();
    } catch (err) {
      showToast("Failed to record payment");
    } finally {
      setProcessing(false);
    }
  };

  const statusColors = {
    draft: "bg-yellow-500",
    pending: "bg-blue-600",
    partial: "bg-purple-600",
    paid: "bg-green-600",
    overdue: "bg-red-600"
  };

  const progressColor =
    progress === 100
      ? "bg-green-600"
      : progress > 50
      ? "bg-blue-600"
      : "bg-yellow-500";

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* Back Button */}
      <button
        onClick={() => navigate("/admin/invoices")}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Back to Invoices
      </button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Invoice #{invoice.id}
          </h1>
          <p className="text-gray-500 text-sm">
            Created on{" "}
            {formatLocalDate(invoice.created_at)}
          </p>
        </div>

        <span
          className={`px-4 py-2 rounded-full text-white font-semibold ${statusColors[invoice.status]}`}
        >
          {invoice.status.toUpperCase()}
        </span>
      </div>

      {invoice.status === "overdue" && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-xl mb-8">
          ⚠ This invoice is overdue. Immediate action required.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* LEFT SIDE */}
        <div className="xl:col-span-2 space-y-8">

          {/* Client Info */}
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="text-lg font-semibold mb-3">Bill To</h2>
            <p className="font-semibold">{invoice.client?.name}</p>
            <p className="text-gray-600">{invoice.client?.email}</p>
            <p className="text-gray-600">{invoice.client?.phone}</p>
          </div>

          {/* Items */}
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="text-lg font-semibold mb-4">
              Container Breakdown
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="py-3 px-4">Container</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {item.container?.name}
                      </td>
                      <td className="py-3 px-4">{item.quantity}</td>
                      <td className="py-3 px-4">
                        {formatCurrency(item.price_snapshot)}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="text-lg font-semibold mb-4">
              Payment History
            </h2>

            {payments.length === 0 ? (
              <p className="text-gray-500">
                No payments recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <span>
                      {formatLocalDate(p.created_at)}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-8">

          {/* Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-md border xl:sticky xl:top-6">
            <h2 className="text-lg font-semibold mb-4">
              Payment Summary
            </h2>

            <div className="flex justify-between mb-2">
              <span>Total</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>

            <div className="flex justify-between mb-2">
              <span>Paid</span>
              <span>{formatCurrency(invoice.amount_paid)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Balance</span>
              <span
                className={
                  balance > 0 ? "text-red-600" : "text-green-600"
                }
              >
                {formatCurrency(balance)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`${progressColor} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {progress.toFixed(0)}% Paid
            </p>
          </div>

          {/* Add Payment */}
          {invoice.status !== "paid" && user.role === "admin" && (
            <div className="bg-white p-6 rounded-2xl shadow-md border">
              <h2 className="text-lg font-semibold mb-4">
                Record Payment
              </h2>

              <input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(e.target.value)
                }
                className="p-3 border rounded-lg w-full mb-4 focus:ring-2 focus:ring-black"
              />

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition disabled:bg-gray-400"
              >
                {processing ? "Processing..." : "Add Payment"}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

    </div>
  );
};

export default InvoiceDetail;
