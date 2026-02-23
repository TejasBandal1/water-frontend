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
    <div className="page-shell">
      <section className="page-hero">
        <p className="page-eyebrow">Recovery</p>
        <h1 className="page-title">Missing Bills Entry</h1>
        <p className="page-subtitle">Create a delivery bill on behalf of a driver when a trip was missed.</p>
      </section>

      <div className="panel mb-8 p-6">
        <h2 className="section-title">Bill Details</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="form-label">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="form-select"
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
            <label className="form-label">
              Driver
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="form-select"
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
            <label className="form-label">
              Bill Date & Time
            </label>
            <input
              type="datetime-local"
              value={billDateTime}
              onChange={(e) => setBillDateTime(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              Admin Notes / Comments
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Reason or context"
              className="form-input"
            />
          </div>
        </div>
      </div>

      <div className="panel mb-8 p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">Container Quantities</h2>
          <div className="flex gap-6 text-sm">
            <span className="font-medium text-emerald-700">Delivered: {totalDelivered}</span>
            <span className="font-medium text-amber-700">Returned: {totalReturned}</span>
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
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Returned</label>
                  <input
                    type="number"
                    min="0"
                    value={quantities[index]?.returned_qty || 0}
                    onChange={(e) => setQty(index, "returned_qty", e.target.value)}
                    className="form-input"
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
          className="btn-primary px-6 py-3"
        >
          {submitting ? "Saving..." : "Add Missing Bill"}
        </button>

        <button
          onClick={resetForm}
          type="button"
          className="btn-secondary px-6 py-3"
        >
          Reset
        </button>
      </div>

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MissingBills;
