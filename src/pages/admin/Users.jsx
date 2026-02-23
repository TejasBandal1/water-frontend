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
      role: u.role?.name,
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
    users.filter((u) => u.role?.name === role).length;

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
    <div className="min-h-screen bg-gray-50 px-4 md:px-10 py-6">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          Team & Access Control
        </h1>
        <p className="text-gray-500 text-sm">
          Manage users and permissions
        </p>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard title="Admins" value={roleCount("admin")} />
        <SummaryCard title="Managers" value={roleCount("manager")} />
        <SummaryCard title="Drivers" value={roleCount("driver")} />
        <SummaryCard title="Clients" value={roleCount("client")} />
      </div>

      {/* CREATE / EDIT FORM */}
      <div className="bg-white p-6 rounded-2xl shadow mb-10 border">
        <h2 className="text-lg font-semibold mb-4">
          {editingUser ? "Edit User" : "Create New User"}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="p-2 border rounded-lg"
          />

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="p-2 border rounded-lg"
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
            className="p-2 border rounded-lg"
          />

          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value })
            }
            className="p-2 border rounded-lg"
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
              className="p-2 border rounded-lg"
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
            className="bg-black text-white px-6 py-2 rounded-lg disabled:bg-gray-400"
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
              className="bg-gray-400 text-white px-6 py-2 rounded-lg"
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
          className="p-2 border rounded-lg w-full sm:w-96"
        />
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-2xl shadow border overflow-x-auto">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No users found
          </div>
        ) : (
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Change Role</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">
                    {roleBadge(u.role?.name)}
                  </td>
                  <td className="p-4">
                    <select
                      value={u.role?.name}
                      disabled={u.id === user.id}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value)
                      }
                      className="p-2 border rounded-lg"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="driver">Driver</option>
                      <option value="client">Client</option>
                    </select>
                  </td>
                  <td className="p-4 space-x-2">
                    <button
                      onClick={() => handleEditClick(u)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>

                    {u.id !== user.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
        <div className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value }) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl shadow hover:shadow-md transition border">
    <h3 className="text-gray-500 text-sm">{title}</h3>
    <h2 className="text-xl md:text-2xl font-bold mt-2">{value}</h2>
  </div>
);

export default Users;
