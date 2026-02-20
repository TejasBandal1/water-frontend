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
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold">
          📦 Orders Breakdown
        </h1>
        <p className="text-gray-500 text-sm">
          Container-level delivery details
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow">

        {loading ? (
          <div className="p-6 text-gray-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-gray-500">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="py-3 px-4">Trip ID</th>
                  <th className="py-3 px-4">Container</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Returned</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">

                    <td className="py-3 px-4 font-medium">
                      #{order.trip_id}
                    </td>

                    <td className="py-3 px-4">
                      {order.container?.name}
                    </td>

                    <td className="py-3 px-4 text-green-600">
                      {order.delivered_qty}
                    </td>

                    <td className="py-3 px-4 text-orange-600">
                      {order.returned_qty}
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
