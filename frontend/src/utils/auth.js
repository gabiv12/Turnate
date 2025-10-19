// src/utils/auth.js
export function isAdmin(user) {
  if (!user) return false;
  const id = Number(user.id);
  const role = String(user.rol || "").toLowerCase();
  return id === 1 || role === "admin";
}

export function rehydrateUserIfNeeded(user, setUser) {
  if (user?.id) return user;
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) {
        setUser?.(u);
        return u;
      }
    }
  } catch {}
  return user;
}
