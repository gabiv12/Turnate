// src/hooks/useTurnos.js
import { useEffect, useState } from "react";
import api from "../services/api";

/**
 * Helpers
 */
const toISO = (v) => {
  try {
    const d = new Date(v);
    if (isNaN(d)) return v;
    // Normalizamos sin milisegundos: YYYY-MM-DDTHH:mm:ssZ
    return new Date(d.getTime() - d.getMilliseconds())
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");
  } catch {
    return v;
  }
};
const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

/**
 * Hook principal de turnos para el panel del emprendedor.
 */
function useTurnos() {
  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Cargar servicios del emprendedor al montar
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await api.get("/servicios/mis");
        setServicios(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error cargando mis servicios:", e);
        setErr(e?.response?.data?.detail || e?.message || "No se pudieron cargar los servicios.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Carga turnos con filtro (ej. { desde, hasta })
   */
  const cargarTurnos = async (filtro = {}) => {
    const { data } = await api.get("/turnos/mis", { params: filtro });
    setTurnos(Array.isArray(data) ? data : []);
  };

  /**
   * Atajo: cargar turnos por rango (Date | ISO)
   */
  const cargarTurnosEntre = async (desde, hasta) => {
    return cargarTurnos({ desde: toISO(desde), hasta: toISO(hasta) });
  };

  /**
   * Busca servicio por id para saber su duración
   */
  const getServicio = (id) => servicios.find((s) => Number(s.id) === Number(id)) || null;

  /**
   * Crea un turno (privado, panel del emprendedor).
   * Acepta:
   *  - servicio_id (obligatorio)
   *  - inicio (ISO/Date) o datetime (ISO/Date)
   *  - fin (opcional, si no viene lo calculamos por duración del servicio)
   *  - cliente_nombre (string), cliente_telefono (opcional), notas (opcional)
   *
   * Retorna el turno creado (obj) y refresca la lista si pasás { onOkReload: {desde, hasta} }.
   */
  const crearTurno = async ({
    servicio_id,
    inicio,
    datetime,          // alias
    fin,
    cliente_nombre,
    cliente_telefono,
    notas,
    onOkReload,        // {desde, hasta} opcional para refrescar listado tras crear
  }) => {
    const srv = getServicio(servicio_id);
    const base = inicio || datetime;
    if (!servicio_id || !base) {
      throw new Error("Falta servicio_id o fecha/hora de inicio.");
    }

    const iISO = toISO(base);
    // Si no pasan 'fin', calculamos con la duración del servicio o 60 min por defecto
    const durMin = Number(srv?.duracion_min || 0) || 60;
    const fISO = fin ? toISO(fin) : new Date(new Date(iISO).getTime() + durMin * 60000).toISOString();

    // Variantes de body para esquivar 422
    const bodyVariants = [
      // A) snake “completo”
      clean({ servicio_id: Number(servicio_id), inicio: iISO, fin: fISO, cliente_nombre, cliente_telefono, notas }),
      // B) snake minimal
      clean({ servicio_id: Number(servicio_id), inicio: iISO, cliente_nombre }),
      // C) camel
      clean({ servicioId: Number(servicio_id), start: iISO, end: fISO, nombreCliente: cliente_nombre, telefonoCliente: cliente_telefono, comentario: notas }),
      // D) camel minimal
      clean({ servicioId: Number(servicio_id), start: iISO, nombre: cliente_nombre }),
      // E) anidado (algunos APIs)
      clean({ servicio_id: Number(servicio_id), inicio: iISO, fin: fISO, cliente: clean({ nombre: cliente_nombre, telefono: cliente_telefono }), notas }),
    ];

    // Rutas privadas típicas (probamos varias por compat.)
    const routes = [
      { method: "post", url: "/turnos" },
      { method: "post", url: "/turnos/create" },
      { method: "post", url: "/api/turnos" },
      { method: "post", url: "/api/turnos/create" },
    ];

    let lastErr;
    for (const r of routes) {
      for (const body of bodyVariants) {
        try {
          const resp = await api[r.method](r.url, body);
          const out = resp?.data ?? resp;
          // refresco opcional del listado
          if (onOkReload?.desde && onOkReload?.hasta) {
            await cargarTurnosEntre(onOkReload.desde, onOkReload.hasta);
          }
          return out;
        } catch (e) {
          lastErr = e;
          const s = e?.response?.status;
          // errores “reales”
          if (s === 409) throw e; // conflicto de horario
          if (s === 401) throw e; // auth
          // 422/400/404/405/500 => seguimos probando
          continue;
        }
      }
    }
    throw lastErr || new Error("No se pudo crear el turno (formato no admitido).");
  };

  /**
   * Reprograma un turno existente (privado).
   * Acepta:
   *  - turno_id (obligatorio), inicio (ISO/Date), fin (opcional)
   */
  const reprogramarTurno = async ({ turno_id, inicio, fin }) => {
    if (!turno_id || !inicio) throw new Error("Falta turno_id o nueva fecha/hora de inicio.");
    const iISO = toISO(inicio);
    const fISO = fin ? toISO(fin) : undefined;

    const bodyVariants = [
      clean({ inicio: iISO, fin: fISO }),
      clean({ start: iISO, end: fISO }),
      clean({ nuevo_inicio: iISO, nuevo_fin: fISO }),
    ];

    const routes = [
      { method: "put", url: `/turnos/${turno_id}` },
      { method: "patch", url: `/turnos/${turno_id}` },
      { method: "post", url: `/turnos/${turno_id}/reprogramar` },
      { method: "post", url: `/api/turnos/${turno_id}/reprogramar` },
    ];

    let lastErr;
    for (const r of routes) {
      for (const body of bodyVariants) {
        try {
          const resp = await api[r.method](r.url, body);
          return resp?.data ?? resp;
        } catch (e) {
          lastErr = e;
          const s = e?.response?.status;
          if (s === 401) throw e;
          continue;
        }
      }
    }
    throw lastErr || new Error("No se pudo reprogramar el turno.");
  };

  /**
   * Cancela un turno existente (privado).
   * Acepta:
   *  - turno_id (obligatorio), motivo (opcional)
   */
  const cancelarTurno = async ({ turno_id, motivo }) => {
    if (!turno_id) throw new Error("Falta turno_id.");
    const bodyVariants = [
      undefined, // DELETE sin body
      clean({ motivo }),
      clean({ estado: "cancelado", motivo }),
    ];
    const routes = [
      { method: "delete", url: `/turnos/${turno_id}` },
      { method: "post", url: `/turnos/${turno_id}/cancelar` },
      { method: "patch", url: `/turnos/${turno_id}`, body: clean({ estado: "cancelado", motivo }) },
    ];

    let lastErr;
    // 1) intentamos DELETE
    try {
      const r = await api.delete(`/turnos/${turno_id}`);
      return r?.data ?? r;
    } catch (e) {
      lastErr = e;
    }
    // 2) intentamos POST cancelar
    try {
      const r = await api.post(`/turnos/${turno_id}/cancelar`, clean({ motivo }));
      return r?.data ?? r;
    } catch (e) {
      lastErr = e;
    }
    // 3) intentamos PATCH estado=cancelado
    try {
      const r = await api.patch(`/turnos/${turno_id}`, clean({ estado: "cancelado", motivo }));
      return r?.data ?? r;
    } catch (e) {
      lastErr = e;
    }
    throw lastErr || new Error("No se pudo cancelar el turno.");
  };

  return {
    servicios,
    turnos,
    loading,
    error: err,

    // loaders
    cargarTurnos,
    cargarTurnosEntre,

    // acciones
    crearTurno,          // crea (privado)
    reprogramarTurno,    // reprograma (privado)
    cancelarTurno,       // cancela (privado)
  };
}

export default useTurnos;
export { useTurnos };
