import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import {
  getLocalDateInputValue,
  toLocalDateKey
} from "../../utils/dateTime";

const getDateKey = (value) => toLocalDateKey(value);

const formatDateLabel = (dateKey) => {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return dateKey;
  return `${day}-${month}`;
};

const buildMatrix = (rows) => {
  const dates = [...new Set(rows.map((row) => getDateKey(row.date)))].sort();
  const customers = [...new Set(rows.map((row) => row.name))].sort();

  const valueMap = new Map();
  rows.forEach((row) => {
    const dateKey = getDateKey(row.date);
    const key = `${row.name}__${dateKey}`;
    valueMap.set(key, (valueMap.get(key) || 0) + Number(row.total_delivered || 0));
  });

  const getValue = (customer, dateKey) => valueMap.get(`${customer}__${dateKey}`) || 0;

  const getRowTotal = (customer) =>
    dates.reduce((sum, dateKey) => sum + getValue(customer, dateKey), 0);

  const getColumnTotal = (dateKey) =>
    customers.reduce((sum, customer) => sum + getValue(customer, dateKey), 0);

  const grandTotal = customers.reduce((sum, customer) => sum + getRowTotal(customer), 0);

  return {
    dates,
    customers,
    getValue,
    getRowTotal,
    getColumnTotal,
    grandTotal,
  };
};

const DeliveryMatrix = () => {
  const { user } = useContext(AuthContext);

  const [data, setData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState("custom");
  const [loading, setLoading] = useState(false);

  /* ================= DATE FILTER LOGIC ================= */

  const setQuickFilter = (type) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (type === "weekly") {
      const first = new Date();
      first.setDate(today.getDate() - today.getDay());
      start = new Date(first);
    }

    if (type === "monthly") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    if (type === "yearly") {
      start = new Date(today.getFullYear(), 0, 1);
    }

    setFilterType(type);
    setStartDate(getLocalDateInputValue(start));
    setEndDate(getLocalDateInputValue(end));
  };

  /* ================= FETCH DATA ================= */

  const fetchData = async () => {
    if (!startDate || !endDate || !user?.token) return;

    try {
      setLoading(true);

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/delivery-matrix`,
        {
          params: { start_date: startDate, end_date: endDate },
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuickFilter("monthly");
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, user?.token]);

  /* ================= MATRIX BUILD ================= */

  const matrices = useMemo(() => {
    const grouped = new Map();

    data.forEach((row) => {
      const containerId = row.container_id ?? "all";
      const containerName = row.container_name || "All Containers";

      if (!grouped.has(containerId)) {
        grouped.set(containerId, {
          containerId,
          containerName,
          rows: [],
        });
      }

      grouped.get(containerId).rows.push(row);
    });

    return [...grouped.values()]
      .sort((a, b) => a.containerName.localeCompare(b.containerName))
      .map((group) => ({
        ...group,
        matrix: buildMatrix(group.rows),
      }));
  }, [data]);

  /* ================= CSV DOWNLOAD ================= */

  const downloadCSV = () => {
    let csv = `Delivery Matrix Report\nDate Range,${startDate} to ${endDate}\n\n`;

    matrices.forEach(({ containerName, matrix }) => {
      csv += `Container,${containerName}\n`;
      csv += "Customer," + matrix.dates.join(",") + ",Total\n";

      matrix.customers.forEach((customer) => {
        const rowValues = matrix.dates.map((dateKey) => matrix.getValue(customer, dateKey));
        csv += `${customer},${rowValues.join(",")},${matrix.getRowTotal(customer)}\n`;
      });

      csv += "Total,";
      csv += matrix.dates.map((dateKey) => matrix.getColumnTotal(dateKey)).join(",");
      csv += `,${matrix.grandTotal}\n\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "delivery_matrix_container_wise.csv";
    a.click();
  };

  return (
    <div className="page-shell">
      {/* ================= HEADER ================= */}
      <section className="page-hero">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="page-eyebrow">Operations Report</p>
            <h1 className="page-title">Delivery Matrix Report</h1>
            <p className="page-subtitle">Container-wise customer delivery breakdown by date and totals.</p>
          </div>

          <button
            onClick={downloadCSV}
            className="btn-secondary bg-white text-slate-900 hover:bg-slate-100"
          >
            Download CSV
          </button>
        </div>
      </section>

      {/* ================= FILTER BAR ================= */}
      <div className="panel mb-8 p-5">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setFilterType("custom");
                setStartDate(e.target.value);
              }}
              className="form-input"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setFilterType("custom");
                setEndDate(e.target.value);
              }}
              className="form-input"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["daily", "weekly", "monthly", "yearly"].map((type) => (
              <button
                key={type}
                onClick={() => setQuickFilter(type)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filterType === type ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= TABLES ================= */}

      {loading ? (
        <div className="panel p-10 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full mx-auto" />
        </div>
      ) : matrices.length === 0 ? (
        <div className="panel p-8 text-center text-slate-500">
          No delivery data found for the selected range.
        </div>
      ) : (
        <div className="space-y-8">
          {matrices.map(({ containerId, containerName, matrix }) => (
            <div key={containerId} className="panel overflow-x-auto">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">{containerName}</h2>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                  Total: {matrix.grandTotal}
                </span>
              </div>

              <table className="min-w-full text-center text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr>
                    <th className="sticky left-0 bg-slate-100 p-3 text-left">Customer</th>

                    {matrix.dates.map((dateKey) => (
                      <th key={dateKey} className="p-3" title={dateKey}>
                        {formatDateLabel(dateKey)}
                      </th>
                    ))}

                    <th className="bg-slate-200 p-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {matrix.customers.map((customer) => (
                    <tr key={customer} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="sticky left-0 bg-white p-3 text-left font-medium">{customer}</td>

                      {matrix.dates.map((dateKey) => (
                        <td key={dateKey} className="p-3">
                          {matrix.getValue(customer, dateKey)}
                        </td>
                      ))}

                      <td className="bg-slate-100 p-3 font-semibold">{matrix.getRowTotal(customer)}</td>
                    </tr>
                  ))}

                  <tr className="bg-slate-200 font-bold">
                    <td className="sticky left-0 bg-slate-200 p-3 text-left">Total</td>

                    {matrix.dates.map((dateKey) => (
                      <td key={dateKey} className="p-3">
                        {matrix.getColumnTotal(dateKey)}
                      </td>
                    ))}

                    <td className="p-3">{matrix.grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryMatrix;
