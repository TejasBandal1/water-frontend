import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const getMyInvoices = async (token) => {
  const res = await axios.get(`${API}/client/invoices`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};

export const getMyBalance = async (token) => {
  const res = await axios.get(`${API}/client/balance`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};