import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient
} from "../../api/admin";

const Clients = () => {
  const { user } = useContext(AuthContext);

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");

  const initialForm = {
    name: "",
    email: "",
    phone: "",
    address: "",
    billing_type: "monthly",
    billing_interval: 1
  };

  const [form, setForm] = useState(initialForm);

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.detail || fallback;

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await getClients(user.token);
      setClients(data || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      showToast("Name and Email are required");
      return;
    }

    if (form.billing_interval < 1) {
      showToast("Billing interval must be at least 1");
      return;
    }

    try {
      setSaving(true);

      if (editingClient) {
        await updateClient(editingClient.id, form, user.token);
        showToast("Client updated successfully");
      } else {
        await createClient(form, user.token);
        showToast("Client created successfully");
      }

      setForm(initialForm);
      setEditingClient(null);
      setShowModal(false);
      fetchClients();
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this client?")) return;
    try {
      await deleteClient(id, user.token);
      showToast("Client deactivated");
      fetchClients();
    } catch (err) {
      console.error("Delete client error:", err);
      showToast(getErrorMessage(err, "Delete failed"));
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      billing_type: client.billing_type || "monthly",
      billing_interval: client.billing_interval || 1
    });
    setShowModal(true);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  /* ================= SEARCH ================= */

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  /* ================= BILLING TEXT ================= */

  const formatBilling = (client) => {
    const interval = client.billing_interval || 1;
    const type = client.billing_type || "monthly";

    if (interval === 1) return `Every ${type}`;
    return `Every ${interval} ${type}s`;
  };

  return (
    <div className="page-shell">

      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="page-eyebrow">Client Registry</p>
            <h1 className="page-title">Clients Management</h1>
            <p className="page-subtitle">Manage customer records and billing cycles with cleaner workflows.</p>
          </div>

          <button
            onClick={() => {
              setEditingClient(null);
              setForm(initialForm);
              setShowModal(true);
            }}
            className="btn-secondary bg-white text-slate-900 hover:bg-slate-100"
          >
            + Add Client
          </button>
        </div>
      </section>

      {/* SEARCH */}
      <div className="mb-6 panel p-4">
        <label className="form-label">Search</label>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full sm:w-96"
        />
      </div>

      {/* TABLE */}
      <div className="table-shell">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">No clients found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-main">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Billing</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id}>

                    <td>
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.phone || "-"}
                      </div>
                    </td>

                    <td>
                      {c.email}
                    </td>

                    <td className="capitalize">
                      {formatBilling(c)}
                    </td>

                    <td className="text-right space-x-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="btn-secondary px-3 py-1.5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="btn-danger px-3 py-1.5"
                      >
                        Delete
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="panel w-full max-w-xl p-6 shadow-2xl">

            <h2 className="section-title mb-6">
              {editingClient ? "Edit Client" : "Add Client"}
            </h2>

            <div className="grid gap-4">

              <Input label="Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Input label="Email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <Input label="Phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              <Input label="Address" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />

              {/* Billing Type */}
              <div>
                <label className="form-label">
                  Billing Type
                </label>
                <select
                  value={form.billing_type}
                  onChange={(e) =>
                    setForm({ ...form, billing_type: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Billing Interval */}
              <div>
                <label className="form-label">
                  Billing Interval
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.billing_interval}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      billing_interval: Number(e.target.value)
                    })
                  }
                  className="form-input"
                />
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

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

/* ================= INPUT ================= */

const Input = ({ label, value, onChange }) => (
  <div>
    <label className="form-label">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      className="form-input"
    />
  </div>
);

export default Clients;
