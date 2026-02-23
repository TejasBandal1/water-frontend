import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getDriverOrders } from "../../api/admin";

const DriverOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getDriverOrders(user.token);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="page-eyebrow">Operations</p>
        <h1 className="page-title">Orders Breakdown</h1>
        <p className="page-subtitle">Container-level delivery details across all your recorded trips.</p>
      </section>

      <div className="table-shell">

        {loading ? (
          <div className="p-6 text-slate-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-main">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Container</th>
                  <th>Delivered</th>
                  <th>Returned</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order, index) => (
                  <tr key={order.id}>

                    <td className="font-semibold text-slate-900">
                      #{order.trip_id}
                    </td>

                    <td>
                      {order.container?.name}
                    </td>

                    <td>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {order.delivered_qty}
                      </span>
                    </td>

                    <td>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {order.returned_qty}
                      </span>
                      {index === 0 && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          latest
                        </span>
                      )}
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

export default DriverOrders;

