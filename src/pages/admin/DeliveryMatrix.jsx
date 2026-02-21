import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

const getDateKey = (value) => String(value).slice(0, 10);

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
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
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
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Delivery Matrix Report</h1>
          <p className="text-gray-500 text-sm mt-1">Container-wise customer delivery breakdown by date</p>
        </div>

        <button
          onClick={downloadCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition"
        >
          Download CSV
        </button>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="bg-white p-5 rounded-2xl shadow-md mb-8 border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setFilterType("custom");
                setStartDate(e.target.value);
              }}
              className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setFilterType("custom");
                setEndDate(e.target.value);
              }}
              className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["daily", "weekly", "monthly", "yearly"].map((type) => (
              <button
                key={type}
                onClick={() => setQuickFilter(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === type ? "bg-black text-white" : "bg-gray-200 hover:bg-gray-300"
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
        <div className="bg-white p-10 rounded-2xl shadow-md text-center">
          <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full mx-auto" />
        </div>
      ) : matrices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center text-gray-500">
          No delivery data found for the selected range.
        </div>
      ) : (
        <div className="space-y-8">
          {matrices.map(({ containerId, containerName, matrix }) => (
            <div key={containerId} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-x-auto">
              <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">{containerName}</h2>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                  Total: {matrix.grandTotal}
                </span>
              </div>

              <table className="min-w-full text-sm text-center">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left sticky left-0 bg-gray-100">Customer</th>

                    {matrix.dates.map((dateKey) => (
                      <th key={dateKey} className="p-3" title={dateKey}>
                        {formatDateLabel(dateKey)}
                      </th>
                    ))}

                    <th className="p-3 bg-blue-100">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {matrix.customers.map((customer) => (
                    <tr key={customer} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-left font-medium sticky left-0 bg-white">{customer}</td>

                      {matrix.dates.map((dateKey) => (
                        <td key={dateKey} className="p-3">
                          {matrix.getValue(customer, dateKey)}
                        </td>
                      ))}

                      <td className="p-3 font-semibold bg-blue-50">{matrix.getRowTotal(customer)}</td>
                    </tr>
                  ))}

                  <tr className="bg-gray-200 font-bold">
                    <td className="p-3 text-left sticky left-0 bg-gray-200">Total</td>

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
