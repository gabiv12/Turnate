// src/hooks/useTurnos.js
import { useEffect, useState } from "react";
import api from "../services/api";

function useTurnos() {
  const [servicios, setServicios] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/servicios/mis");
        setServicios(data || []);
      } catch (e) {
        console.error("Error cargando mis servicios:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cargarTurnos = async (filtro = {}) => {
    const { data } = await api.get("/turnos/mis", { params: filtro });
    setTurnos(data || []);
  };

  return { servicios, turnos, cargarTurnos, loading };
}

export default useTurnos;
export { useTurnos };
