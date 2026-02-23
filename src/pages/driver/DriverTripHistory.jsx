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
    <div className="page-shell">

      {/* HEADER */}
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-eyebrow">Operations</p>
            <h1 className="page-title">Trip History</h1>
            <p className="page-subtitle">Complete record of your deliveries with responsive filters.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-select bg-white/95 text-slate-800"
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
              className="form-input bg-white/95 text-slate-800"
            />
          )}

        </div>
        </div>
      </section>

      {/* TABLE */}
      <div className="table-shell">

        {loading ? (
          <div className="p-6 text-slate-500">
            Loading trips...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="empty-state">
            No trips found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-main">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Client</th>
                  <th>Delivered</th>
                  <th>Returned</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredTrips.map((trip) => (
                  <tr key={trip.id}>

                    <td className="font-semibold text-slate-900">
                      #{trip.id}
                    </td>

                    <td>
                      {trip.client?.name}
                    </td>

                    <td>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {trip.total_delivered || 0}
                      </span>
                    </td>

                    <td>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {trip.total_returned || 0}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
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

