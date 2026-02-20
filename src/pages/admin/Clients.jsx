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
    await deleteClient(id, user.token);
    showToast("Client deleted");
    fetchClients();
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
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Clients Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customers and billing cycles
          </p>
        </div>

        <button
          onClick={() => {
            setEditingClient(null);
            setForm(initialForm);
            setShowModal(true);
          }}
          className="bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition"
        >
          + Add Client
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No clients found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">

              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="py-4 px-4">Client</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Billing</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">

                    <td className="py-4 px-4">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.phone || "-"}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {c.email}
                    </td>

                    <td className="py-4 px-4 capitalize">
                      {formatBilling(c)}
                    </td>

                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white w-full max-w-xl p-6 rounded-2xl shadow-xl">

            <h2 className="text-lg font-semibold mb-6">
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
                <label className="block text-sm text-gray-600 mb-2">
                  Billing Type
                </label>
                <select
                  value={form.billing_type}
                  onChange={(e) =>
                    setForm({ ...form, billing_type: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Billing Interval */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
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
                  className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black"
                />
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

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

/* ================= INPUT ================= */

const Input = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-2">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black"
    />
  </div>
);

export default Clients;