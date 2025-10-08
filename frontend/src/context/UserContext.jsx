import { createContext, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext(null);

export function UserProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("turnate_token");
    const u = localStorage.getItem("turnate_user");
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
    setReady(true);
  }, []);

  function login({ access_token, user }) {
    setToken(access_token);
    setUser(user);
    localStorage.setItem("turnate_token", access_token);
    localStorage.setItem("turnate_user", JSON.stringify(user));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("turnate_token");
    localStorage.removeItem("turnate_user");
  }

  const value = useMemo(() => ({ token, user, login, logout, setUser }), [token, user]);

  if (!ready) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUser debe usarse dentro de <UserProvider>");
  return v;
}
