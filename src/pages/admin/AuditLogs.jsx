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
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* ================= HEADER ================= */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          System Activity Logs
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Transparent tracking of every system action
        </p>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search by user, role, action, entity or details..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 px-4 py-3 rounded-xl border border-gray-300 shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* ================= TABLE ================= */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-black border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-full text-left">

              <thead className="bg-gray-100 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Time
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    User
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Action
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Entity
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-16 text-gray-400">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition duration-150"
                    >

                      {/* TIME */}
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>

                      {/* USER */}
                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-gray-800">
                          {log.user?.name || "Deleted User"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Role: {log.user?.role || "N/A"} | ID: {log.user?.id || "-"}
                        </div>
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4">
                        <ActionBadge action={log.action} />
                      </td>

                      {/* ENTITY */}
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="font-medium">
                          {log.entity?.type || "-"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {log.entity?.id || "-"}
                        </div>
                      </td>

                      {/* DETAILS */}
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
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
                            className="text-blue-600 text-xs mt-2 hover:underline"
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
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    CONFIRM: "bg-purple-100 text-purple-700",
    ADD: "bg-indigo-100 text-indigo-700",
    SET: "bg-yellow-100 text-yellow-700",
    GENERATE: "bg-pink-100 text-pink-700"
  };

  const key = Object.keys(colorMap).find((k) =>
    action?.includes(k)
  );

  const classes = key
    ? colorMap[key]
    : "bg-gray-100 text-gray-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {action || "UNKNOWN"}
    </span>
  );
};

export default AuditLogs;
