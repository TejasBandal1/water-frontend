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

  const handleChange = (index, field, value) => {
    const updated = [...quantities];
    updated[index][field] = Math.max(0, Number(value));
    setQuantities(updated);
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
        (sum, q) => sum + Number(q.returned_qty || 0),
        0
      ),
    [quantities]
  );

  const hasAnyEntry = totalDelivered > 0 || totalReturned > 0;

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!selectedClient)
      return alert("Please select a client");

    if (!hasAnyEntry)
      return alert("Enter at least one delivery or return quantity");

    try {
      setSubmitting(true);

      const tripData = {
        client_id: Number(selectedClient),
        containers: quantities
      };

      await createTrip(tripData, user.token);

      alert("Trip recorded successfully!");

      setSelectedClient("");
      setClientSearch("");
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

      {/* ================= CONTAINER ENTRY ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {containers.map((container, index) => (
          <div
            key={container.id}
            className="panel p-6 transition hover:shadow-md"
          >
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {container.name}
            </h3>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="text-sm text-slate-600">
                  Delivered
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantities[index]?.delivered_qty}
                  onChange={(e) =>
                    handleChange(index, "delivered_qty", e.target.value)
                  }
                  className="form-input mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">
                  Returned
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantities[index]?.returned_qty}
                  onChange={(e) =>
                    handleChange(index, "returned_qty", e.target.value)
                  }
                  className="form-input mt-1"
                />
              </div>

            </div>
          </div>
        ))}

      </div>

      {/* ================= SUBMIT ================= */}
      <div className="mt-10">
        <button
          onClick={handleSubmit}
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

    </div>
  );
};

export default Trip;


