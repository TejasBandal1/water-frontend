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
    <div className="page-shell">

      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="page-eyebrow">Master Data</p>
            <h1 className="page-title">Container Management</h1>
            <p className="page-subtitle">Maintain active container types with clear status visibility.</p>
          </div>
          <button
            onClick={() => {
              setEditingContainer(null);
              setForm({ name: "", description: "" });
              setShowModal(true);
            }}
            className="btn-secondary bg-white text-slate-900 hover:bg-slate-100"
          >
            + Add Container
          </button>
        </div>
      </section>

      {/* FILTERS */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Search container..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="form-input"
        />

        <button
          onClick={() => setShowInactive(!showInactive)}
          className="btn-secondary"
        >
          {showInactive ? "Hide Inactive" : "Show Inactive"}
        </button>

        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="btn-secondary"
        >
          Sort {sortAsc ? "A-Z" : "Z-A"}
        </button>
      </div>

      {/* TABLE */}
      <div className="table-shell">

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full" />
          </div>
        ) : paginatedContainers.length === 0 ? (
          <div className="empty-state">No containers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-main">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedContainers.map((c) => (
                  <tr key={c.id}>

                    <td className="font-semibold text-slate-900">
                      {c.name}
                    </td>

                    <td className="text-slate-600">
                      {c.description || "-"}
                    </td>

                    <td>
                      <StatusBadge active={c.is_active} />
                    </td>

                    <td className="text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingContainer(c);
                          setForm({
                            name: c.name,
                            description: c.description || ""
                          });
                          setShowModal(true);
                        }}
                        className="btn-secondary px-3 py-1.5"
                      >
                        Edit
                      </button>

                      {c.is_active && (
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="btn-danger px-3 py-1.5"
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="btn-danger"
            >
              Deactivate
            </button>
          </div>
        </Modal>
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

/* MODAL COMPONENT */
const Modal = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
    onClick={onClose}
  >
    <div
      className="panel w-full max-w-md p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

/* INPUT */
const Input = ({ label, value, onChange }) => (
  <div className="mb-4">
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

/* STATUS BADGE */
const StatusBadge = ({ active }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
      active
        ? "bg-emerald-100 text-emerald-700"
        : "bg-red-100 text-red-600"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

export default Containers;


