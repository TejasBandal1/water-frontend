import { useEffect, useMemo, useState } from "react";
import { getPendingReturns } from "../../api/admin";

const PendingReturns = () => {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    loadData();
  }, [appliedSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [filteredData, fullData] = await Promise.all([
        getPendingReturns(appliedSearch),
        getPendingReturns()
      ]);
      setRows(filteredData || []);
      setAllRows(fullData || []);
    } catch {
      showToast("Failed to load pending return data");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };

  const totalClients = rows.length;
  const totalPendingQty = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.total_pending_return || 0), 0),
    [rows]
  );
  const totalContainerBuckets = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.containers?.length || 0), 0),
    [rows]
  );
  const clientSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = allRows || [];

    if (!term) {
      return list.slice(0, 8);
    }

    return list
      .filter((row) => row.client_name?.toLowerCase().includes(term))
      .slice(0, 8);
  }, [allRows, search]);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="page-eyebrow">Recovery Intelligence</p>
            <h1 className="page-title">Pending Container Returns</h1>
            <p className="page-subtitle">Track clients with outstanding returnable containers and prioritize follow-up.</p>
          </div>
          <button onClick={loadData} className="btn-secondary bg-white text-slate-900 hover:bg-slate-100">
            Refresh
          </button>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Clients Pending" value={totalClients} />
        <MetricCard label="Units Pending" value={totalPendingQty} accent="text-red-600" />
        <MetricCard label="Container Buckets" value={totalContainerBuckets} />
      </div>

      <div className="panel mb-6 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="form-label mb-0">Search Client</label>
          {appliedSearch && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Active: {appliedSearch}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by client name..."
              value={search}
              onFocus={() => setShowClientDropdown(true)}
              onBlur={() => {
                window.setTimeout(() => setShowClientDropdown(false), 120);
              }}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowClientDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setAppliedSearch(search.trim());
                  setShowClientDropdown(false);
                }
              }}
              className="form-input w-full pl-10 pr-20"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setShowClientDropdown(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            )}

            {showClientDropdown && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {clientSuggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    No pending-return clients found.
                  </p>
                ) : (
                  clientSuggestions.map((client) => (
                    <button
                      key={client.client_id}
                      type="button"
                      onMouseDown={() => {
                        setSearch(client.client_name);
                        setAppliedSearch(client.client_name);
                        setShowClientDropdown(false);
                      }}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-900">{client.client_name}</p>
                      <p className="text-xs text-slate-500">
                        Pending units: {Number(client.total_pending_return || 0)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setAppliedSearch(search.trim())}
            className="btn-primary whitespace-nowrap px-5 py-2.5"
          >
            Apply
          </button>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
              setShowClientDropdown(false);
            }}
            className="btn-secondary whitespace-nowrap px-5 py-2.5"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No clients have pending returnable containers.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-main min-w-[860px]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total Pending</th>
                  <th>Container Types</th>
                  <th>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.client_id}>
                    <td>
                      <div className="font-semibold text-slate-900">{row.client_name}</div>
                      <div className="text-xs text-slate-500">Client ID: {row.client_id}</div>
                    </td>
                    <td>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        {Number(row.total_pending_return || 0)}
                      </span>
                    </td>
                    <td>{row.containers?.length || 0}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {(row.containers || []).map((container) => (
                          <span
                            key={`${row.client_id}_${container.container_id}`}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {container.container_name}: {container.pending_qty}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

const MetricCard = ({ label, value, accent = "text-slate-900" }) => (
  <div className="stat-card">
    <p className="stat-label">{label}</p>
    <p className={`mt-2 text-2xl font-bold ${accent}`}>{Number(value || 0)}</p>
  </div>
);

export default PendingReturns;
