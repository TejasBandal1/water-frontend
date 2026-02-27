import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getDriverClients,
  getDriverContainers,
  createTrip
} from "../../api/admin";

const Trip = () => {
  const { user } = useContext(AuthContext);

  const [clients, setClients] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);
  const [quantities, setQuantities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitReview, setShowSubmitReview] = useState(false);
  const [autoMatchReturns, setAutoMatchReturns] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const clientsData = await getDriverClients(user.token);
      const containersData = await getDriverContainers(user.token);

      setClients(clientsData || []);
      setContainers(containersData || []);

      setQuantities(
        (containersData || []).map((c) => ({
          container_id: c.id,
          delivered_qty: 0,
          returned_qty: 0
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CLIENT FILTER ================= */

  const filteredClients = useMemo(() => {
    const search = clientSearch.trim().toLowerCase();

    const matches = clients.filter((c) => {
      if (!search) return true;
      return (
        c.name?.toLowerCase().includes(search) ||
        c.city?.toLowerCase().includes(search) ||
        c.address?.toLowerCase().includes(search) ||
        c.location?.toLowerCase().includes(search)
      );
    });

    return matches.slice(0, 8);
  }, [clients, clientSearch]);

  const selectedClientDetails = useMemo(
    () => clients.find((c) => String(c.id) === String(selectedClient)) || null,
    [clients, selectedClient]
  );

  const formatClientLocation = (client) =>
    client.city || client.location || client.address || "No location";

  const selectClient = (client) => {
    setSelectedClient(String(client.id));
    setClientSearch(client.name || "");
    setShowClientResults(false);
  };

  /* ================= HANDLE INPUT ================= */

  const toQty = (value) => {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  };

  const handleChange = (index, field, value) => {
    const updated = [...quantities];
    const container = containers[index];
    const nextValue = toQty(value);

    if (field === "returned_qty" && container?.is_returnable === false) {
      updated[index][field] = 0;
      setQuantities(updated);
      return;
    }

    updated[index][field] = nextValue;

    if (field === "delivered_qty" && autoMatchReturns && container?.is_returnable !== false) {
      updated[index].returned_qty = nextValue;
    }

    setQuantities(updated);
  };

  const adjustQty = (index, field, delta) => {
    const current = Number(quantities[index]?.[field] || 0);
    const next = Math.max(0, current + delta);
    handleChange(index, field, next);
  };

  const copyAllDeliveredToReturned = () => {
    setQuantities((prev) =>
      prev.map((row, index) => {
        const container = containers[index];
        if (container?.is_returnable === false) {
          return { ...row, returned_qty: 0 };
        }
        return { ...row, returned_qty: Number(row.delivered_qty || 0) };
      })
    );
  };

  /* ================= TOTALS ================= */

  const totalDelivered = useMemo(
    () =>
      quantities.reduce(
        (sum, q) => sum + Number(q.delivered_qty || 0),
        0
      ),
    [quantities]
  );

  const totalReturned = useMemo(
    () =>
      quantities.reduce(
        (sum, q, index) =>
          sum +
          (containers[index]?.is_returnable === false
            ? 0
            : Number(q.returned_qty || 0)),
        0
      ),
    [quantities, containers]
  );

  const enteredContainers = useMemo(
    () =>
      quantities
        .map((q, index) => {
          const container = containers[index];
          const deliveredQty = Number(q.delivered_qty || 0);
          const returnedQty =
            container?.is_returnable === false
              ? 0
              : Number(q.returned_qty || 0);

          return {
            container_id: q.container_id,
            container_name: container?.name || "Container",
            is_returnable: container?.is_returnable !== false,
            delivered_qty: deliveredQty,
            returned_qty: returnedQty
          };
        })
        .filter((entry) => entry.delivered_qty > 0 || entry.returned_qty > 0),
    [quantities, containers]
  );

  const hasAnyEntry = enteredContainers.length > 0;
  const mismatchCount = useMemo(
    () =>
      enteredContainers.filter(
        (entry) =>
          entry.is_returnable &&
          Number(entry.delivered_qty || 0) !== Number(entry.returned_qty || 0)
      ).length,
    [enteredContainers]
  );

  /* ================= SUBMIT ================= */

  const openSubmitReview = () => {
    if (!selectedClient)
      return alert("Please select a client");

    if (!hasAnyEntry)
      return alert("Enter at least one delivery or return quantity");

    setShowSubmitReview(true);
  };

  const handleSubmit = async () => {
    if (!selectedClient) return;
    if (!hasAnyEntry) return;

    try {
      setSubmitting(true);

      const tripData = {
        client_id: Number(selectedClient),
        containers: enteredContainers.map((entry) => ({
          container_id: entry.container_id,
          delivered_qty: entry.delivered_qty,
          returned_qty: entry.returned_qty
        }))
      };

      await createTrip(tripData, user.token);

      alert("Trip recorded successfully!");

      setSelectedClient("");
      setClientSearch("");
      setShowSubmitReview(false);
      fetchData();

    } catch {
      alert("Failed to record trip");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Loading trip form...
      </div>
    );

  return (
    <div className="page-shell">

      {/* ================= HEADER ================= */}
      <section className="page-hero">
        <p className="page-eyebrow">Trip Entry</p>
        <h1 className="page-title">Record New Trip</h1>
        <p className="page-subtitle">Search a client, capture delivered and returned containers, and submit clean logs fast.</p>
      </section>

      {/* ================= CLIENT SECTION ================= */}
      <div className="panel mb-8 p-6">

        <label className="form-label">
          Search and Select Client
        </label>

        <div className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="Search client by name, city, or address..."
            value={clientSearch}
            onFocus={() => setShowClientResults(true)}
            onBlur={() => {
              window.setTimeout(() => setShowClientResults(false), 120);
            }}
            onChange={(e) => {
              const value = e.target.value;
              setClientSearch(value);
              setShowClientResults(true);
              if (
                selectedClientDetails &&
                value.trim() !== selectedClientDetails.name
              ) {
                setSelectedClient("");
              }
            }}
            className="form-input w-full bg-white pr-20"
          />

          {clientSearch && (
            <button
              type="button"
              onClick={() => {
                setClientSearch("");
                setSelectedClient("");
                setShowClientResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Clear
            </button>
          )}

          {showClientResults && (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {filteredClients.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">
                  No clients found.
                </p>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onMouseDown={() => selectClient(client)}
                    className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatClientLocation(client)}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedClientDetails && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Selected Client
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {selectedClientDetails.name}
              </p>
              <p className="text-xs text-slate-600">
                {formatClientLocation(selectedClientDetails)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedClient("");
                setClientSearch("");
              }}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Change Client
            </button>
          </div>
        )}

      </div>

      {/* ================= SUMMARY BAR ================= */}
      <div className="panel mb-8 flex flex-wrap justify-between gap-6 p-4">

        <div>
          <span className="text-sm text-slate-500">
            Total Delivered
          </span>
          <div className="text-xl font-bold text-emerald-700">
            {totalDelivered}
          </div>
        </div>

        <div>
          <span className="text-sm text-slate-500">
            Total Returned
          </span>
          <div className="text-xl font-bold text-amber-700">
            {totalReturned}
          </div>
        </div>

      </div>

      <div className="panel mb-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={autoMatchReturns}
            onChange={(e) => setAutoMatchReturns(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Auto set Returned = Delivered
        </label>

        <button
          type="button"
          onClick={copyAllDeliveredToReturned}
          className="btn-secondary px-4 py-2 text-xs"
        >
          Copy All Delivered to Returned
        </button>
      </div>

      {/* ================= CONTAINER ENTRY ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {containers.map((container, index) => (
          <div
            key={container.id}
            className="panel p-6 transition hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {container.name}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  container.is_returnable
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {container.is_returnable ? "Returnable" : "Not Returnable"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="text-sm text-slate-600">
                  Delivered
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQty(index, "delivered_qty", -1)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantities[index]?.delivered_qty}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      handleChange(index, "delivered_qty", e.target.value)
                    }
                    className="form-input text-center"
                  />
                  <button
                    type="button"
                    onClick={() => adjustQty(index, "delivered_qty", 1)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600">
                  Returned
                </label>
                {container.is_returnable === false ? (
                  <input
                    type="text"
                    value="Not tracked for this container"
                    disabled
                    className="form-input mt-1 cursor-not-allowed bg-slate-100 text-slate-500"
                  />
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustQty(index, "returned_qty", -1)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quantities[index]?.returned_qty}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) =>
                        handleChange(index, "returned_qty", e.target.value)
                      }
                      className="form-input text-center"
                    />
                    <button
                      type="button"
                      onClick={() => adjustQty(index, "returned_qty", 1)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

            </div>

            {container.is_returnable !== false && (
              <button
                type="button"
                onClick={() =>
                  handleChange(
                    index,
                    "returned_qty",
                    quantities[index]?.delivered_qty || 0
                  )
                }
                className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Set Returned = Delivered
              </button>
            )}
          </div>
        ))}

      </div>

      {/* ================= SUBMIT ================= */}
      <div className="mt-10">
        {mismatchCount > 0 && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            {mismatchCount} container{mismatchCount > 1 ? "s" : ""} has different Delivered and Returned quantities. Please verify before submit.
          </p>
        )}
        <button
          onClick={openSubmitReview}
          disabled={!hasAnyEntry || submitting}
          className={`rounded-xl px-8 py-3 text-white transition ${
            hasAnyEntry
              ? "bg-slate-900 hover:bg-slate-800"
              : "cursor-not-allowed bg-slate-400"
          }`}
        >
          {submitting ? "Submitting..." : "Submit Trip"}
        </button>
      </div>

      {showSubmitReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Trip Details</h3>
            <p className="mt-1 text-sm text-slate-600">
              Please verify quantities before saving.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedClientDetails?.name || "Not selected"}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <span>Container</span>
                <span className="text-right">Delivered</span>
                <span className="text-right">Returned</span>
              </div>

              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto bg-white">
                {enteredContainers.map((entry) => (
                  <div
                    key={`review_${entry.container_id}`}
                    className="grid grid-cols-3 gap-2 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-900">{entry.container_name}</span>
                    <span className="text-right font-semibold text-emerald-700">
                      {entry.delivered_qty}
                    </span>
                    <span className="text-right font-semibold text-amber-700">
                      {entry.is_returnable ? entry.returned_qty : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Delivered</p>
                <p className="mt-1 text-base font-bold text-emerald-700">{totalDelivered}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Returned</p>
                <p className="mt-1 text-base font-bold text-amber-700">{totalReturned}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSubmitReview(false)}
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed sm:w-auto"
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Trip;


