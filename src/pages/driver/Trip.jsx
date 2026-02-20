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
    const search = clientSearch.toLowerCase();

    return clients.filter((c) => {
      return (
        c.name?.toLowerCase().includes(search) ||
        c.city?.toLowerCase().includes(search) ||
        c.address?.toLowerCase().includes(search) ||
        c.location?.toLowerCase().includes(search)
      );
    });
  }, [clients, clientSearch]);

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

      alert("✅ Trip recorded successfully!");

      setSelectedClient("");
      setClientSearch("");
      fetchData();

    } catch (err) {
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
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">

      {/* ================= HEADER ================= */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          🚚 Record New Trip
        </h1>
        <p className="text-gray-500 text-sm">
          Log container deliveries and returns
        </p>
      </div>

      {/* ================= CLIENT SECTION ================= */}
      <div className="bg-white p-6 rounded-2xl shadow mb-8">

        <label className="block text-sm font-medium mb-3">
          Select Client
        </label>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by name, city, or location..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="w-full md:w-96 p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
        />

        {/* Dropdown */}
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full md:w-96 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose Client</option>

          {filteredClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.city || c.address || "No location"}
            </option>
          ))}
        </select>

        {filteredClients.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No clients found.
          </p>
        )}

      </div>

      {/* ================= SUMMARY BAR ================= */}
      <div className="bg-white p-4 rounded-2xl shadow mb-8 flex flex-wrap gap-6 justify-between">

        <div>
          <span className="text-gray-500 text-sm">
            Total Delivered
          </span>
          <div className="text-xl font-bold text-blue-600">
            {totalDelivered}
          </div>
        </div>

        <div>
          <span className="text-gray-500 text-sm">
            Total Returned
          </span>
          <div className="text-xl font-bold text-green-600">
            {totalReturned}
          </div>
        </div>

      </div>

      {/* ================= CONTAINER ENTRY ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {containers.map((container, index) => (
          <div
            key={container.id}
            className="bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold mb-4">
              📦 {container.name}
            </h3>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className="text-sm text-gray-600">
                  Delivered
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantities[index]?.delivered_qty}
                  onChange={(e) =>
                    handleChange(index, "delivered_qty", e.target.value)
                  }
                  className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Returned
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantities[index]?.returned_qty}
                  onChange={(e) =>
                    handleChange(index, "returned_qty", e.target.value)
                  }
                  className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
          className={`px-8 py-3 rounded-xl text-white transition ${
            hasAnyEntry
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {submitting ? "Submitting..." : "Submit Trip"}
        </button>
      </div>

    </div>
  );
};

export default Trip;
