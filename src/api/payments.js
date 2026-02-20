import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

export const recordPayment = async (invoiceId, amount, token) => {
  const res = await axios.post(
    `${API_BASE}/payments/record/${invoiceId}?amount=${amount}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data;
};