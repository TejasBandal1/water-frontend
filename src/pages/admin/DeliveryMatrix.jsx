import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

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
    let start, end;

    if (type === "daily") {
      start = new Date();
      end = new Date();
    }

    if (type === "weekly") {
      const first = new Date();
      first.setDate(today.getDate() - today.getDay());
      start = new Date(first);
      end = new Date();
    }

    if (type === "monthly") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date();
    }

    if (type === "yearly") {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date();
    }

    setFilterType(type);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  /* ================= FETCH DATA ================= */

  const fetchData = async () => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);

      const res = await axios.get(
  `${import.meta.env.VITE_API_URL}/admin/delivery-matrix`,
  {
    params: { start_date: startDate, end_date: endDate },
    headers: { Authorization: `Bearer ${user.token}` }
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
    fetchData();
  }, [startDate, endDate]);

  /* ================= MATRIX BUILD ================= */

  const dates = useMemo(() => {
    return [...new Set(data.map(d =>
      new Date(d.date).getDate()
    ))].sort((a, b) => a - b);
  }, [data]);

  const customers = useMemo(() => {
    return [...new Set(data.map(d => d.name))];
  }, [data]);

  const getValue = (customer, day) => {
    const row = data.find(
      d =>
        d.name === customer &&
        new Date(d.date).getDate() === day
    );
    return row ? row.total_delivered : 0;
  };

  const getRowTotal = (customer) =>
    dates.reduce((sum, day) => sum + getValue(customer, day), 0);

  const getColumnTotal = (day) =>
    customers.reduce((sum, customer) => sum + getValue(customer, day), 0);

  const grandTotal = customers.reduce(
    (sum, c) => sum + getRowTotal(c),
    0
  );

  /* ================= CSV DOWNLOAD ================= */

  const downloadCSV = () => {
    let csv = "Customer," + dates.join(",") + ",Total\n";

    customers.forEach(customer => {
      const rowValues = dates.map(day =>
        getValue(customer, day)
      );
      csv += `${customer},${rowValues.join(",")},${getRowTotal(customer)}\n`;
    });

    csv += "Total,";
    csv += dates.map(day => getColumnTotal(day)).join(",");
    csv += `,${grandTotal}\n`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "delivery_matrix.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-10 py-6">

      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Delivery Matrix Report
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Customer delivery breakdown by date
          </p>
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
              onChange={e => {
                setFilterType("custom");
                setStartDate(e.target.value);
              }}
              className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            />

            <input
              type="date"
              value={endDate}
              onChange={e => {
                setFilterType("custom");
                setEndDate(e.target.value);
              }}
              className="border px-3 py-2 rounded-lg focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["daily","weekly","monthly","yearly"].map(type => (
              <button
                key={type}
                onClick={() => setQuickFilter(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === type
                    ? "bg-black text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* ================= TABLE ================= */}

      {loading ? (
        <div className="bg-white p-10 rounded-2xl shadow-md text-center">
          <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-x-auto">

          <table className="min-w-full text-sm text-center">

            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left sticky left-0 bg-gray-100">
                  Customer
                </th>

                {dates.map(day => (
                  <th key={day} className="p-3">
                    {day}
                  </th>
                ))}

                <th className="p-3 bg-blue-100">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.map(customer => (
                <tr key={customer} className="border-b hover:bg-gray-50">

                  <td className="p-3 text-left font-medium sticky left-0 bg-white">
                    {customer}
                  </td>

                  {dates.map(day => (
                    <td key={day} className="p-3">
                      {getValue(customer, day)}
                    </td>
                  ))}

                  <td className="p-3 font-semibold bg-blue-50">
                    {getRowTotal(customer)}
                  </td>
                </tr>
              ))}

              <tr className="bg-gray-200 font-bold">
                <td className="p-3 text-left sticky left-0 bg-gray-200">
                  Total
                </td>

                {dates.map(day => (
                  <td key={day} className="p-3">
                    {getColumnTotal(day)}
                  </td>
                ))}

                <td className="p-3">
                  {grandTotal}
                </td>
              </tr>

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
};

export default DeliveryMatrix;
