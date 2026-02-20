import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const getInvoiceDetail = async (invoiceId, token) => {
  const response = await axios.get(
    `${API}/admin/billing/${invoiceId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  return response.data;
};