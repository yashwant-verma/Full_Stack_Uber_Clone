import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:3000",
  timeout: 20000,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const errorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.errors?.[0]?.msg ||
  "Cannot reach the server. Please retry.";
export default api;
