import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getClients,
  getContainers,
  getClientPrices,
  setClientPrice
} from "../../api/admin";
import { compareDatesDesc, formatLocalDate } from "../../utils/dateTime";

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
    `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => formatLocalDate(date);

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
      map[k] = map[k].sort((a, b) =>
        compareDatesDesc(
          a.effective_from || a.created_at,
          b.effective_from || b.created_at
        )
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

      return compareDatesDesc(
        a.effective_from || a.created_at,
        b.effective_from || b.created_at
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
    <div className="page-shell">

      <section className="page-hero">
        <p className="page-eyebrow">Billing Rules</p>
        <h1 className="page-title">Price Management</h1>
        <p className="page-subtitle">Manage client-specific pricing with clear version history and active status.</p>
      </section>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <SummaryCard title="Active Price Rules" value={activePricesCount} />
        <SummaryCard title="Total Clients" value={clients.length} />
        <SummaryCard title="Active Containers" value={containers.length} />
      </div>

      {/* FILTER BAR */}
      <div className="panel mb-6 flex flex-wrap items-center gap-4 p-4">
        <select
          value={selectedClientFilter}
          onChange={(e) => setSelectedClientFilter(e.target.value)}
          className="form-select"
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
          className="form-input min-w-[200px] flex-1"
        />

        <button
          onClick={resetFilters}
          className="btn-secondary"
        >
          Reset
        </button>
      </div>

      {/* CREATE PRICE */}
      <div className="panel mb-10 p-6">
        <h2 className="section-title mb-4">
          Create / Update Price Rule
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={form.client_id}
            onChange={(e) =>
              setForm({ ...form, client_id: e.target.value })
            }
            className="form-select"
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
            className="form-select"
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
            placeholder="Price (Rs.)"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value })
            }
            className="form-input"
          />

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="table-shell">
        <table className="table-main min-w-[700px]">
          <thead>
            <tr>
              <th>Client</th>
              <th>Container</th>
              <th>Price</th>
              <th>Effective</th>
              <th>Status</th>
              <th>History</th>
            </tr>
          </thead>

          <tbody>
            {paginatedPrices.map((p) => (
              <tr
                key={p.id}
                className={`${
                  isLatest(p) ? "bg-green-50" : ""
                }`}
              >
                <td>{getClientName(p.client_id)}</td>
                <td>{getContainerName(p.container_id)}</td>
                <td className="font-semibold text-slate-900">
                  {formatCurrency(p.price)}
                </td>
                <td>
                  {formatDate(p.effective_from)}
                </td>
                <td>
                  {isLatest(p) ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">
                      Archived
                    </span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() =>
                      setHistoryModal(
                        latestMap[
                          `${p.client_id}_${p.container_id}`
                        ] || []
                      )
                    }
                    className="text-sm font-semibold text-blue-700 hover:underline"
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
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                currentPage === i + 1
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700"
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
          <div className="panel max-h-[80vh] w-full max-w-md overflow-y-auto p-6 shadow-xl">
            <h3 className="section-title mb-4">
              Price History
            </h3>

            {historyModal.map((h) => (
              <div
                key={h.id}
                className="flex justify-between border-b border-slate-200 py-2"
              >
                <span className="font-semibold">
                  {formatCurrency(h.price)}
                </span>
                <span>{formatDate(h.effective_from)}</span>
              </div>
            ))}

            <button
              onClick={() => setHistoryModal(null)}
              className="btn-primary mt-4 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value }) => (
  <div className="stat-card">
    <h3 className="stat-label">{title}</h3>
    <h2 className="stat-value">{value}</h2>
  </div>
);

export default Pricing;


