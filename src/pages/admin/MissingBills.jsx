import { useEffect, useMemo, useState } from "react";
import {
  createManualBill,
  getClients,
  getContainers,
  getDrivers
} from "../../api/admin";

const getDefaultDateTime = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const MissingBills = () => {
  const [clients, setClients] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [containers, setContainers] = useState([]);

  const [clientId, setClientId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [billDateTime, setBillDateTime] = useState(getDefaultDateTime());
  const [comments, setComments] = useState("");
  const [quantities, setQuantities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, driversData, containersData] = await Promise.all([
        getClients(),
        getDrivers(),
        getContainers()
      ]);

      setClients(clientsData || []);
      setDrivers(driversData || []);

      const activeContainers = (containersData || []).filter(
        (c) => c.is_active !== false
      );

      setContainers(activeContainers);
      setQuantities(
        activeContainers.map((c) => ({
          container_id: c.id,
          delivered_qty: 0,
          returned_qty: 0
        }))
      );
    } catch {
      showToast("Failed to load master data");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };

  const setQty = (index, field, value) => {
    const updated = [...quantities];
    updated[index][field] = Math.max(0, Number(value || 0));
    setQuantities(updated);
  };

  const totalDelivered = useMemo(
    () => quantities.reduce((sum, q) => sum + Number(q.delivered_qty || 0), 0),
    [quantities]
  );

  const totalReturned = useMemo(
    () => quantities.reduce((sum, q) => sum + Number(q.returned_qty || 0), 0),
    [quantities]
  );

  const hasAnyQty = totalDelivered > 0 || totalReturned > 0;

  const resetForm = () => {
    setClientId("");
    setDriverId("");
    setBillDateTime(getDefaultDateTime());
    setComments("");
    setQuantities(
      containers.map((c) => ({
        container_id: c.id,
        delivered_qty: 0,
        returned_qty: 0
      }))
    );
  };

  const handleSubmit = async () => {
    if (!clientId) {
      showToast("Please select a client");
      return;
    }

    if (!driverId) {
      showToast("Please select a driver");
      return;
    }

    if (!billDateTime) {
      showToast("Please select bill date and time");
      return;
    }

    if (!hasAnyQty) {
      showToast("Enter at least one delivered or returned quantity");
      return;
    }

    if (
      !window.confirm(
        "Create this missing bill entry? Please verify date, driver, and quantities."
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        client_id: Number(clientId),
        driver_id: Number(driverId),
        bill_datetime: billDateTime,
        comments: comments.trim() || null,
        containers: quantities
      };

      const res = await createManualBill(payload);
      showToast(`${res.message} (Trip #${res.trip_id})`);
      resetForm();
    } catch (err) {
      showToast(err?.response?.data?.detail || "Failed to create missing bill");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Missing Bills Entry
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a delivery bill on behalf of driver when a trip was missed.
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Bill Details</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Driver
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bill Date & Time
            </label>
            <input
              type="datetime-local"
              value={billDateTime}
              onChange={(e) => setBillDateTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Admin Notes / Comments
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Reason or context"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">Container Quantities</h2>
          <div className="flex gap-6 text-sm">
            <span className="font-medium text-blue-700">Delivered: {totalDelivered}</span>
            <span className="font-medium text-emerald-700">Returned: {totalReturned}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {containers.map((container, index) => (
            <div
              key={container.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="mb-3 text-sm font-semibold text-slate-900">{container.name}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Delivered</label>
                  <input
                    type="number"
                    min="0"
                    value={quantities[index]?.delivered_qty || 0}
                    onChange={(e) => setQty(index, "delivered_qty", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Returned</label>
                  <input
                    type="number"
                    min="0"
                    value={quantities[index]?.returned_qty || 0}
                    onChange={(e) => setQty(index, "returned_qty", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !hasAnyQty}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? "Saving..." : "Add Missing Bill"}
        </button>

        <button
          onClick={resetForm}
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Reset
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-xl bg-black px-6 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MissingBills;
