// src/setupAuthHeaders.js
import axios from "axios";

export function applyAuthHeaderFromStorage() {
  const t = localStorage.getItem("turnate_token");
  if (t) {
    axios.defaults.headers.common.Authorization = `Bearer ${t}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

/** Parchea window.fetch para agregar Authorization cuando llame al backend */
export function patchFetchForAuth() {
  const backHosts = ["http://localhost:8000", "http://127.0.0.1:8000"];
  const origFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const hitBackend = backHosts.some((base) => url.startsWith(base)) || url.startsWith("/api");
      if (hitBackend) {
        const token = localStorage.getItem("turnate_token");
        if (token) {
          const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
          if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
          return origFetch(input, { ...init, headers });
        }
      }
    } catch (e) {
      // no-op
    }
    return origFetch(input, init);
  };
}
