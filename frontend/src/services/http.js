// Cliente axios único con token automático
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  withCredentials: false,
});

// Agrega el Bearer en cada request si existe el token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("turnate_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;
