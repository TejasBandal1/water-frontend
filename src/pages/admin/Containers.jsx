import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import {
  getContainers,
  createContainer,
  updateContainer,
  deleteContainer
} from "../../api/admin";

const ITEMS_PER_PAGE = 6;

const Containers = () => {
  const { user } = useContext(AuthContext);

  const [containers, setContainers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const data = await getContainers(user.token);
      setContainers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= TOAST ================= */

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ================= CREATE / UPDATE ================= */

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast("Container name is required");
      return;
    }

    try {
      if (editingContainer) {
        await updateContainer(editingContainer.id, form, user.token);
        showToast("Container updated");
      } else {
        await createContainer(form, user.token);
        showToast("Container created");
      }

      setForm({ name: "", description: "" });
      setEditingContainer(null);
      setShowModal(false);
      fetchContainers();
    } catch {
      showToast("Failed to save");
    }
  };

  /* ================= DELETE ================= */

  const confirmDelete = async () => {
    await deleteContainer(deleteId, user.token);
    setDeleteId(null);
    showToast("Container deactivated");
    fetchContainers();
  };

  /* ================= FILTER + SORT ================= */

  const processedContainers = useMemo(() => {
    let data = containers
      .filter((c) => (showInactive ? true : c.is_active))
      .filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );

    data.sort((a, b) =>
      sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

    return data;
  }, [containers, search, showInactive, sortAsc]);

  const totalPages = Math.ceil(
    processedContainers.length / ITEMS_PER_PAGE
  );

  const paginatedContainers = processedContainers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Container Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage container types
          </p>
        </div>

        <button
          onClick={() => {
            setEditingContainer(null);
            setForm({ name: "", description: "" });
            setShowModal(true);
          }}
          className="bg-black text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition"
        >
          + Add Container
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search container..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:w-80 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black"
        />

        <button
          onClick={() => setShowInactive(!showInactive)}
          className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm"
        >
          {showInactive ? "Hide Inactive" : "Show Inactive"}
        </button>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-sm"
        >
          Sort {sortAsc ? "A-Z" : "Z-A"}
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full" />
          </div>
        ) : paginatedContainers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No containers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">

              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Description</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {paginatedContainers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">

                    <td className="px-4 py-4 font-medium">
                      {c.name}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {c.description || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge active={c.is_active} />
                    </td>

                    <td className="px-4 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingContainer(c);
                          setForm({
                            name: c.name,
                            description: c.description || ""
                          });
                          setShowModal(true);
                        }}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-lg"
                      >
                        Edit
                      </button>

                      {c.is_active && (
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
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
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h2 className="text-lg font-semibold mb-6">
            {editingContainer ? "Edit Container" : "Add Container"}
          </h2>

          <Input
            label="Container Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <Input
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-black text-white rounded-xl"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)}>
          <p className="mb-6">Deactivate this container?</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 bg-gray-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-xl"
            >
              Deactivate
            </button>
          </div>
        </Modal>
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

/* MODAL COMPONENT */
const Modal = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
    onClick={onClose}
  >
    <div
      className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

/* INPUT */
const Input = ({ label, value, onChange }) => (
  <div className="mb-4">
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

/* STATUS BADGE */
const StatusBadge = ({ active }) => (
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold ${
      active
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-600"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

export default Containers;


