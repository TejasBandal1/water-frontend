import API from "./axiosInstance";

/* ==========================================
   CLIENTS
========================================== */

export const getClients = async () => {
  const res = await API.get("/admin/clients");
  return res.data;
};

export const createClient = async (data) => {
  const res = await API.post("/admin/clients", data);
  return res.data;
};

export const updateClient = async (clientId, data) => {
  const res = await API.put(`/admin/clients/${clientId}`, data);
  return res.data;
};

export const deleteClient = async (clientId) => {
  const res = await API.delete(`/admin/clients/${clientId}`);
  return res.data;
};

/* ==========================================
   CONTAINERS
========================================== */

export const getContainers = async () => {
  const res = await API.get("/admin/containers");
  return res.data;
};

export const createContainer = async (data) => {
  const res = await API.post("/admin/containers", data);
  return res.data;
};

export const updateContainer = async (id, data) => {
  const res = await API.put(`/admin/containers/${id}`, data);
  return res.data;
};

export const deleteContainer = async (id) => {
  const res = await API.delete(`/admin/containers/${id}`);
  return res.data;
};

/* ==========================================
   PRICING
========================================== */

export const getClientPrices = async () => {
  const res = await API.get("/admin/client-prices");
  return res.data;
};

export const setClientPrice = async (data) => {
  const res = await API.post("/admin/client-prices", data);
  return res.data;
};

/* ==========================================
   DRIVER
========================================== */

export const createTrip = async (data) => {
  const res = await API.post("/driver/trips", data);
  return res.data;
};

export const getDriverClients = async () => {
  const res = await API.get("/driver/clients");
  return res.data;
};

export const getDriverContainers = async () => {
  const res = await API.get("/driver/containers");
  return res.data;
};

export const getDriverTrips = async () => {
  const res = await API.get("/driver/trips");
  return res.data;
};

export const getDriverOrders = async () => {
  const res = await API.get("/driver/orders");
  return res.data;
};

export const getDrivers = async () => {
  const res = await API.get("/admin/drivers");
  return res.data;
};

export const createManualBill = async (data) => {
  const res = await API.post("/admin/manual-bills", data);
  return res.data;
};

/* ==========================================
   BILLING
========================================== */

export const getInvoices = async () => {
  const res = await API.get("/admin/billing/all");
  return res.data;
};

export const generateInvoice = async (clientId) => {
  const res = await API.post(`/admin/billing/generate/${clientId}`);
  return res.data;
};

export const confirmInvoice = async (invoiceId) => {
  const res = await API.post(`/admin/billing/confirm/${invoiceId}`);
  return res.data;
};

export const generateAllInvoices = async () => {
  const res = await API.post("/admin/billing/generate-all");
  return res.data;
};

export const cancelInvoice = async (invoiceId, reason) => {
  const res = await API.post(`/admin/billing/cancel/${invoiceId}`, { reason });
  return res.data;
};

export const voidReissueInvoice = async (invoiceId, reason) => {
  const res = await API.post(`/admin/billing/void-reissue/${invoiceId}`, { reason });
  return res.data;
};

/* ==========================================
   ANALYTICS
========================================== */

export const getRevenuePerClient = async (fromDate, toDate) => {
  const res = await API.get("/analytics/revenue-per-client", {
    params: {
      from_date: fromDate || undefined,
      to_date: toDate || undefined
    }
  });

  return res.data;
};

export const getOutstanding = async (clientId) => {
  const res = await API.get("/analytics/outstanding", {
    params: {
      client_id: clientId || undefined
    }
  });
  return res.data;
};

export const getMonthlyRevenue = async (period, fromDate, toDate, clientId) => {
  const res = await API.get("/analytics/monthly-revenue", {
    params: {
      period: period || "monthly",
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      client_id: clientId || undefined
    }
  });

  return res.data;
};

export const getContainerLoss = async (fromDate, toDate, clientId) => {
  const res = await API.get("/analytics/container-loss", {
    params: {
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      client_id: clientId || undefined
    }
  });

  return res.data;
};

/* ==========================================
   USERS
========================================== */

export const getUsers = async () => {
  const res = await API.get("/admin/users");
  return res.data;
};

export const createUser = async (data) => {
  const res = await API.post("/admin/users", data);
  return res.data;
};

export const updateUserRole = async (userId, role) => {
  const res = await API.put(
    `/admin/users/${userId}/role`,
    {},
    { params: { new_role: role } }
  );
  return res.data;
};

export const updateUser = async (userId, data) => {
  const res = await API.put(`/admin/users/${userId}`, data);
  return res.data;
};

export const deleteUser = async (userId) => {
  const res = await API.delete(`/admin/users/${userId}`);
  return res.data;
};

/* ==========================================
   AUDIT
========================================== */

export const getAuditLogs = async () => {
  const res = await API.get("/admin/audit-logs");
  return res.data;
};
