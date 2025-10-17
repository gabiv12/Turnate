import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../components/api"; // mantiene tu instancia actual

export const UserContext = createContext({
  user: null,
  setUser: () => {},
  loginCtx: async () => {},
  registerCtx: async () => {},
  logout: () => {},
});

function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem("accessToken", token);
      if (api?.defaults?.headers) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
    } else {
      localStorage.removeItem("accessToken");
      if (api?.defaults?.headers?.common?.Authorization) {
        delete api.defaults.headers.common["Authorization"];
      }
    }
  } catch {}
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // Inyectar token guardado al montar
  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) setAuthToken(token);
    } catch {}
  }, []);

  // Persistir user
  useEffect(() => {
    try {
      if (user) localStorage.setItem("user", JSON.stringify(user));
      else localStorage.removeItem("user");
    } catch {}
  }, [user]);

  const loginCtx = async ({ email, username, password }) => {
    const payload = password
      ? (email ? { email, password } : { username, password })
      : { email: email || username };

    // Intento 1
    try {
      const res = await api.post("/usuarios/login", payload);
      const token = res?.data?.token || res?.data?.access_token;
      const u = res?.data?.user || res?.data?.user_schema || res?.data?.usuario || res?.data;
      if (!token || !u) throw new Error("Respuesta de login incompleta");
      setAuthToken(token);
      setUser(u);
      return u;
    } catch (err1) {
      // Intento 2 (fallback)
      try {
        const res = await api.post("/auth/login", payload);
        const token = res?.data?.token || res?.data?.access_token;
        const u = res?.data?.user || res?.data?.usuario || res?.data;
        if (!token || !u) throw new Error("Respuesta de login incompleta");
        setAuthToken(token);
        setUser(u);
        return u;
      } catch (err2) {
        const d = err2?.response?.data || err1?.response?.data;
        const msg = d?.detail || d?.message || "No se pudo iniciar sesión";
        throw new Error(msg);
      }
    }
  };

  const registerCtx = async ({ username, email, password }) => {
    const body = { username, email, password };

    // Intento 1
    try {
      await api.post("/usuarios/", body);
    } catch (e1) {
      const st = e1?.response?.status;
      if (st !== 404 && st !== 405) {
        const d = e1?.response?.data;
        const msg = d?.detail || d?.message || "No se pudo registrar";
        throw new Error(msg);
      }
      // Intento 2
      try {
        await api.post("/usuarios/registro", body);
      } catch (e2) {
        const d = e2?.response?.data || e1?.response?.data;
        const msg = d?.detail || d?.message || "No se pudo registrar";
        throw new Error(msg);
      }
    }
    // Login automático
    return await loginCtx({ email, username, password });
  };

  const logout = () => {
    try {
      localStorage.removeItem("user");
      setAuthToken(null);
    } catch {}
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, setUser, loginCtx, registerCtx, logout }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

export default UserContext;
