import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getDriverTrips } from "../../api/admin";
import {
  formatLocalDateTime,
  isSameLocalDay,
  parseDateValue
} from "../../utils/dateTime";

const DriverTripHistory = () => {
  const { user } = useContext(AuthContext);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await getDriverTrips(user.token);
      setTrips(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER LOGIC ================= */

  const filteredTrips = useMemo(() => {
    if (filterType === "all") return trips;

    const now = new Date();

    return trips.filter((trip) => {
      const tripDate = parseDateValue(trip.created_at);
      if (!tripDate) return false;

      if (filterType === "daily" && selectedDate) {
        return isSameLocalDay(tripDate, selectedDate);
      }

      if (filterType === "weekly") {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return tripDate >= oneWeekAgo;
      }

      if (filterType === "monthly") {
        return (
          tripDate.getMonth() === now.getMonth() &&
          tripDate.getFullYear() === now.getFullYear()
        );
      }

      if (filterType === "yearly") {
        return tripDate.getFullYear() === now.getFullYear();
      }

      return true;
    });

  }, [trips, filterType, selectedDate]);

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            📋 Trip History
          </h1>
          <p className="text-gray-500 text-sm">
            Complete record of your deliveries
          </p>
        </div>

        {/* FILTER SECTION */}
        <div className="flex flex-col sm:flex-row gap-3">

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="daily">Daily</option>
            <option value="weekly">Last 7 Days</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>

          {filterType === "daily" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
          )}

        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow">

        {loading ? (
          <div className="p-6 text-gray-500">
            Loading trips...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-6 text-gray-500">
            No trips found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-4">Trip ID</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Returned</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="border-b hover:bg-gray-50">

                    <td className="py-3 px-4 font-medium">
                      #{trip.id}
                    </td>

                    <td className="py-3 px-4">
                      {trip.client?.name}
                    </td>

                    <td className="py-3 px-4">
                      {trip.total_delivered || 0}
                    </td>

                    <td className="py-3 px-4">
                      {trip.total_returned || 0}
                    </td>

                    <td className="py-3 px-4 font-semibold text-green-600">
                      ₹ {trip.total_amount || 0}
                    </td>

                    <td className="py-3 px-4">
                      {formatLocalDateTime(trip.created_at)}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default DriverTripHistory;
