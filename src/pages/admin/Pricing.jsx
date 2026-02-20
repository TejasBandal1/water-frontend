import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getClients,
  getContainers,
  getClientPrices,
  setClientPrice
} from "../../api/admin";

const ITEMS_PER_PAGE = 8;

const Pricing = () => {
  const { user } = useContext(AuthContext);

  const [clients, setClients] = useState([]);
  const [containers, setContainers] = useState([]);
  const [prices, setPrices] = useState([]);

  const [selectedClientFilter, setSelectedClientFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [historyModal, setHistoryModal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState({
    client_id: "",
    container_id: "",
    price: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const clientsData = await getClients(user.token);
      const containersData = await getContainers(user.token);
      const pricesData = await getClientPrices(user.token);

      const activeContainers = containersData.filter(
        (c) => c.is_active !== false
      );

      setClients(clientsData || []);
      setContainers(activeContainers || []);
      setPrices(pricesData || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load pricing");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const formatCurrency = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "-";

  const getClientName = (id) =>
    clients.find((c) => c.id === id)?.name || "";

  const getContainerName = (id) =>
    containers.find((c) => c.id === id)?.name || "";

  /* ================= SAVE PRICE ================= */

  const handleSubmit = async () => {
    if (!form.client_id || !form.container_id || !form.price) {
      showToast("All fields required");
      return;
    }

    if (Number(form.price) <= 0) {
      showToast("Price must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      await setClientPrice(
        {
          client_id: Number(form.client_id),
          container_id: Number(form.container_id),
          price: Number(form.price)
        },
        user.token
      );

      showToast("Price rule saved successfully");
      setForm({ client_id: "", container_id: "", price: "" });
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to save price");
    } finally {
      setSaving(false);
    }
  };

  /* ================= LATEST MAP ================= */

  const latestMap = useMemo(() => {
    const map = {};

    prices.forEach((p) => {
      const key = `${p.client_id}_${p.container_id}`;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });

    Object.keys(map).forEach((k) => {
      map[k] = map[k].sort(
        (a, b) =>
          new Date(b.effective_from || b.created_at) -
          new Date(a.effective_from || a.created_at)
      );
    });

    return map;
  }, [prices]);

  const isLatest = (p) =>
    latestMap[`${p.client_id}_${p.container_id}`]?.[0]?.id === p.id;

  /* ================= FILTER ================= */

  const filteredPrices = useMemo(() => {
    const filtered = prices
      .filter((p) =>
        selectedClientFilter
          ? p.client_id === Number(selectedClientFilter)
          : true
      )
      .filter((p) => {
        const client = getClientName(p.client_id).toLowerCase();
        const container = getContainerName(p.container_id).toLowerCase();

        return (
          client.includes(searchTerm.toLowerCase()) ||
          container.includes(searchTerm.toLowerCase())
        );
      });

    return filtered.sort((a, b) => {
      const aLatest = isLatest(a);
      const bLatest = isLatest(b);

      if (aLatest && !bLatest) return -1;
      if (!aLatest && bLatest) return 1;

      return (
        new Date(b.effective_from || b.created_at) -
        new Date(a.effective_from || a.created_at)
      );
    });
  }, [prices, selectedClientFilter, searchTerm, latestMap]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(filteredPrices.length / ITEMS_PER_PAGE);

  const paginatedPrices = filteredPrices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSelectedClientFilter("");
    setSearchTerm("");
  };

  const activePricesCount = Object.keys(latestMap).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-10 py-6">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          Price Management
        </h1>
        <p className="text-gray-500 text-sm">
          Manage client-specific pricing rules
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <SummaryCard title="Active Price Rules" value={activePricesCount} />
        <SummaryCard title="Total Clients" value={clients.length} />
        <SummaryCard title="Active Containers" value={containers.length} />
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow mb-6 flex flex-wrap gap-4 items-center border">
        <select
          value={selectedClientFilter}
          onChange={(e) => setSelectedClientFilter(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded-lg flex-1 min-w-[200px]"
        />

        <button
          onClick={resetFilters}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm"
        >
          Reset
        </button>
      </div>

      {/* CREATE PRICE */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10 border">
        <h2 className="text-lg font-semibold mb-4">
          Create / Update Price Rule
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={form.client_id}
            onChange={(e) =>
              setForm({ ...form, client_id: e.target.value })
            }
            className="p-2 border rounded-lg"
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={form.container_id}
            onChange={(e) =>
              setForm({ ...form, container_id: e.target.value })
            }
            className="p-2 border rounded-lg"
          >
            <option value="">Select Container</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Price ₹"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value })
            }
            className="p-2 border rounded-lg"
          />

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-black text-white rounded-lg px-4 py-2 disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow border overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4">Client</th>
              <th className="p-4">Container</th>
              <th className="p-4">Price</th>
              <th className="p-4">Effective</th>
              <th className="p-4">Status</th>
              <th className="p-4">History</th>
            </tr>
          </thead>

          <tbody>
            {paginatedPrices.map((p) => (
              <tr
                key={p.id}
                className={`border-b hover:bg-gray-50 ${
                  isLatest(p) ? "bg-green-50" : ""
                }`}
              >
                <td className="p-4">{getClientName(p.client_id)}</td>
                <td className="p-4">{getContainerName(p.container_id)}</td>
                <td className="p-4 font-semibold">
                  {formatCurrency(p.price)}
                </td>
                <td className="p-4">
                  {formatDate(p.effective_from)}
                </td>
                <td className="p-4">
                  {isLatest(p) ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs">
                      Archived
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <button
                    onClick={() =>
                      setHistoryModal(
                        latestMap[
                          `${p.client_id}_${p.container_id}`
                        ] || []
                      )
                    }
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-lg ${
                currentPage === i + 1
                  ? "bg-black text-white"
                  : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* MODAL */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              Price History
            </h3>

            {historyModal.map((h) => (
              <div
                key={h.id}
                className="flex justify-between py-2 border-b"
              >
                <span className="font-semibold">
                  {formatCurrency(h.price)}
                </span>
                <span>{formatDate(h.effective_from)}</span>
              </div>
            ))}

            <button
              onClick={() => setHistoryModal(null)}
              className="mt-4 w-full bg-black text-white py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value }) => (
  <div className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition">
    <h3 className="text-gray-500 text-sm">{title}</h3>
    <h2 className="text-2xl font-bold mt-2">{value}</h2>
  </div>
);

export default Pricing;
