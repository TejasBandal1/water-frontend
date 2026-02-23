import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getAuditLogs } from "../../api/admin";
import { formatLocalDateTime } from "../../utils/dateTime";

const AuditLogs = () => {
  const { user } = useContext(AuthContext);

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs(user.token);
      setLogs(data || []);
    } catch (err) {
      console.error("Audit log fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SEARCH ================= */

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase();

    return logs.filter((log) => {
      return (
        log.action?.toLowerCase().includes(term) ||
        log.entity?.type?.toLowerCase().includes(term) ||
        log.details?.toLowerCase().includes(term) ||
        log.user?.name?.toLowerCase().includes(term) ||
        log.user?.role?.toLowerCase().includes(term)
      );
    });
  }, [logs, search]);

  const formatDate = (date) => formatLocalDateTime(date);

  return (
    <div className="page-shell">

      {/* ================= HEADER ================= */}
      <section className="page-hero">
        <p className="page-eyebrow">Governance</p>
        <h1 className="page-title">System Activity Logs</h1>
        <p className="page-subtitle">Transparent tracking of every critical system action and operator event.</p>
      </section>

      {/* ================= SEARCH ================= */}
      <div className="panel mb-6 p-4">
        <label className="form-label">Search</label>
        <input
          type="text"
          placeholder="Search by user, role, action, entity or details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input w-full sm:w-[28rem]"
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="table-shell">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="table-main">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>

              <tbody>

                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition duration-150"
                    >

                      {/* TIME */}
                      <td className="whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>

                      {/* USER */}
                      <td>
                        <div className="font-semibold text-slate-900">
                          {log.user?.name || "Deleted User"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Role: {log.user?.role || "N/A"} | ID: {log.user?.id || "-"}
                        </div>
                      </td>

                      {/* ACTION */}
                      <td>
                        <ActionBadge action={log.action} />
                      </td>

                      {/* ENTITY */}
                      <td>
                        <div className="font-medium">
                          {log.entity?.type || "-"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          ID: {log.entity?.id || "-"}
                        </div>
                      </td>

                      {/* DETAILS */}
                      <td className="max-w-xs text-sm text-slate-600">
                        <div
                          className={`${
                            expandedRow === log.id
                              ? ""
                              : "truncate"
                          }`}
                        >
                          {log.details || "-"}
                        </div>

                        {log.details?.length > 80 && (
                          <button
                            onClick={() =>
                              setExpandedRow(
                                expandedRow === log.id ? null : log.id
                              )
                            }
                            className="mt-2 text-xs font-semibold text-blue-700 hover:underline"
                          >
                            {expandedRow === log.id
                              ? "Show less"
                              : "Show more"}
                          </button>
                        )}
                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>
        )}
      </div>

    </div>
  );
};

/* ================= ACTION BADGE ================= */

const ActionBadge = ({ action }) => {

  const colorMap = {
    CREATE: "bg-emerald-100 text-emerald-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    CONFIRM: "bg-indigo-100 text-indigo-700",
    ADD: "bg-indigo-100 text-indigo-700",
    SET: "bg-amber-100 text-amber-700",
    GENERATE: "bg-teal-100 text-teal-700"
  };

  const key = Object.keys(colorMap).find((k) =>
    action?.includes(k)
  );

  const classes = key
    ? colorMap[key]
    : "bg-gray-100 text-gray-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {action || "UNKNOWN"}
    </span>
  );
};

export default AuditLogs;
