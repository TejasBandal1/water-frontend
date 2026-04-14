import { useEffect, useMemo, useState } from "react";
import {
  downloadExcelExport,
  getClients,
  getDrivers
} from "../../api/admin";

const REPORT_TYPES = [
  {
    value: "full",
    label: "Full Report",
    description: "Summary + invoices + invoice items + bills/trips + payments"
  },
  {
    value: "invoices",
    label: "Invoices",
    description: "Invoices and line-item details"
  },
  {
    value: "billing",
    label: "Billing",
    description: "Trips, jars delivered/returned, and linked invoice status"
  },
  {
    value: "payments",
    label: "Payments",
    description: "Payment entries with method and split details"
  }
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" }
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CASH_UPI", label: "Cash + UPI" }
];

const getErrorMessage = async (error) => {
  const data = error?.response?.data;

  if (data && typeof data === "object" && typeof data.detail === "string") {
    return data.detail;
  }

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (typeof parsed?.detail === "string") {
        return parsed.detail;
      }
    } catch {
      return "Failed to generate export";
    }
  }

  return "Failed to generate export";
};

const Exports = () => {
  const [reportType, setReportType] = useState("full");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [clientData, driverData] = await Promise.all([
          getClients(),
          getDrivers()
        ]);
        setClients(Array.isArray(clientData) ? clientData : []);
        setDrivers(Array.isArray(driverData) ? driverData : []);
      } catch {
        setClients([]);
        setDrivers([]);
      }
    };

    loadFilters();
  }, []);

  const activeReport = useMemo(
    () => REPORT_TYPES.find((item) => item.value === reportType) || REPORT_TYPES[0],
    [reportType]
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  };

  const resetFilters = () => {
    setReportType("full");
    setFromDate("");
    setToDate("");
    setClientId("");
    setDriverId("");
    setStatus("");
    setPaymentMethod("");
    setIncludeCancelled(false);
  };

  const onDownload = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      showToast("From date cannot be after To date");
      return;
    }

    try {
      setLoading(true);
      const { blob, filename } = await downloadExcelExport({
        reportType,
        fromDate,
        toDate,
        clientId: clientId || undefined,
        driverId: driverId || undefined,
        status,
        paymentMethod,
        includeCancelled
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "rivarich_export.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast("Excel export downloaded successfully");
    } catch (error) {
      showToast(await getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="page-eyebrow">Administration</p>
        <h1 className="page-title">Export Center</h1>
        <p className="page-subtitle">
          Download professional Excel reports for invoices, billing, and payments with filter-based control.
        </p>
      </section>

      <section className="panel mb-6 p-5">
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected Export</p>
          <p className="mt-1 text-base font-bold text-slate-900">{activeReport.label}</p>
          <p className="mt-1 text-sm text-slate-600">{activeReport.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="form-label">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="form-select"
            >
              {REPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Invoice Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="form-select"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Driver</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="form-select"
            >
              <option value="">All Drivers</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-select"
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex h-[42px] w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={includeCancelled}
                onChange={(e) => setIncludeCancelled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Include Cancelled Invoices
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownload}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Preparing Excel..." : "Generate & Download Excel"}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={loading}
            className="btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="section-title">Export Notes</h2>
        <p className="section-subtitle">
          Every export is logged in Audit Logs with filters used, so reporting remains traceable and professional.
        </p>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default Exports;
