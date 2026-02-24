import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getUsers,
  createUser,
  updateUserRole,
  getClients,
  deleteUser,
  updateUser
} from "../../api/admin";

const Users = () => {
  const { user } = useContext(AuthContext);

  const getRoleValue = (u) => {
    if (!u) return "";
    if (typeof u.role === "string") return u.role.toLowerCase();
    return (u.role?.name || "").toLowerCase();
  };

  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const initialForm = {
    name: "",
    email: "",
    password: "",
    role: "driver",
    client_id: ""
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userData = await getUsers(user.token);
      const clientData = await getClients(user.token);
      setUsers(userData || []);
      setClients(clientData || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      showToast("Name and Email are required");
      return;
    }

    if (!editingUser && !form.password) {
      showToast("Password required for new user");
      return;
    }

    try {
      setSaving(true);

      const payload = { ...form };

      if (form.role !== "client") delete payload.client_id;
      if (!form.password) delete payload.password;

      if (editingUser) {
        await updateUser(editingUser.id, payload, user.token);
        showToast("User updated successfully");
      } else {
        await createUser(payload, user.token);
        showToast("User created successfully");
      }

      setForm(initialForm);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await deleteUser(userId, user.token);
      showToast("User deleted");
      fetchData();
    } catch {
      showToast("Delete failed");
    }
  };

  /* ================= ROLE CHANGE ================= */

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user.id) {
      showToast("You cannot change your own role");
      return;
    }

    if (!window.confirm("Change role?")) return;

    try {
      await updateUserRole(userId, newRole, user.token);
      showToast("Role updated");
      fetchData();
    } catch {
      showToast("Role update failed");
    }
  };

  /* ================= EDIT ================= */

  const handleEditClick = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: getRoleValue(u) || "driver",
      client_id: u.client_id || ""
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setForm(initialForm);
  };

  /* ================= SEARCH FILTER ================= */

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  /* ================= SUMMARY ================= */

  const roleCount = (role) =>
    users.filter((u) => getRoleValue(u) === role).length;

  const roleBadge = (role) => {
    const styles = {
      admin: "bg-purple-100 text-purple-700",
      manager: "bg-blue-100 text-blue-700",
      driver: "bg-green-100 text-green-700",
      client: "bg-gray-200 text-gray-700"
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          styles[role] || "bg-gray-100 text-gray-600"
        }`}
      >
        {role?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="page-shell">

      <section className="page-hero">
        <p className="page-eyebrow">Identity & Access</p>
        <h1 className="page-title">Team & Access Control</h1>
        <p className="page-subtitle">Manage users, roles, and client-linked accounts with stronger operational clarity.</p>
      </section>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard title="Admins" value={roleCount("admin")} />
        <SummaryCard title="Managers" value={roleCount("manager")} />
        <SummaryCard title="Drivers" value={roleCount("driver")} />
        <SummaryCard title="Clients" value={roleCount("client")} />
      </div>

      {/* CREATE / EDIT FORM */}
      <div className="panel mb-10 p-6">
        <h2 className="section-title mb-4">
          {editingUser ? "Edit User" : "Create New User"}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="form-input"
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="form-input"
          />

          <input
            type="password"
            placeholder={
              editingUser
                ? "Leave blank to keep same"
                : "Password"
            }
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            className="form-input"
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value })
            }
            className="form-select"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="driver">Driver</option>
            <option value="client">Client</option>
          </select>

          {form.role === "client" && (
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
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary px-6"
          >
            {saving
              ? "Saving..."
              : editingUser
              ? "Update User"
              : "Create User"}
          </button>

          {editingUser && (
            <button
              onClick={handleCancel}
              className="btn-secondary px-6"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full sm:w-96"
        />
      </div>

      {/* USERS TABLE */}
      <div className="table-shell">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">No users found</div>
        ) : (
          <table className="table-main min-w-[700px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Change Role</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-slate-900">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {roleBadge(getRoleValue(u))}
                  </td>
                  <td>
                    <select
                      value={getRoleValue(u)}
                      disabled={u.id === user.id}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value)
                      }
                      className="form-select"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="driver">Driver</option>
                      <option value="client">Client</option>
                    </select>
                  </td>
                  <td className="space-x-2">
                    <button
                      onClick={() => handleEditClick(u)}
                      className="btn-secondary px-3 py-1.5"
                    >
                      Edit
                    </button>

                    {u.id !== user.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="btn-danger px-3 py-1.5"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
  <div className="stat-card p-4 md:p-6">
    <h3 className="stat-label">{title}</h3>
    <h2 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">{value}</h2>
  </div>
);

export default Users;
