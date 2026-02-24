import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

export const recordPayment = async (invoiceId, payload, token) => {
  const res = await axios.post(
    `${API_BASE}/payments/record/${invoiceId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data;
};
