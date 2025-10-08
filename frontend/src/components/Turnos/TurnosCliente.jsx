import React, { useState, useMemo } from "react";
import Calendario from "../Calendario";
import moment from "moment";

export default function TurnosCliente() {
  const [events, setEvents] = useState([]);

  const turnosForCalendar = useMemo(() => {
    return events.map((e) => ({ ...e, title: `${e.servicio}${e.cliente ? " — " + e.cliente : ""}` }));
  }, [events]);

  const handleReservarTurno = (turno) => {
    // Llamada a FastAPI para reservar el turno con tu token
    alert(`Reservado turno: ${turno.servicio} a las ${moment(turno.start).format("HH:mm")}`);
  };

  return (
    <div className="p-5">
      {events.map((e) => (
        <div key={e.id} className="border p-2 mb-2 rounded flex justify-between items-center">
          <div>
            <p>Fecha: {moment(e.start).format("YYYY-MM-DD")}</p>
            <p>Hora: {moment(e.start).format("HH:mm")}</p>
            <p>Estado: {e.cliente ? "Reservado" : "Disponible"}</p>
          </div>
          {!e.cliente && (
            <button
              className="bg-blue-600 text-white px-2 py-1 rounded"
              onClick={() => handleReservarTurno(e)}
            >
              Reservar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}