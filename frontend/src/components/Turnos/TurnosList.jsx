import React from "react";
import TurnosCard from "./TurnosCard";

export default function TurnosList({ turnos, onReservar, onEditar, onEliminar, isCliente }) {
  if (!turnos || turnos.length === 0) {
    return <p className="text-gray-500">No hay turnos disponibles</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {turnos.map((turno) => (
        <TurnosCard
          key={turno.id}
          turno={turno}
          onReservar={onReservar}
          onEditar={onEditar}
          onEliminar={onEliminar}
          isCliente={isCliente}
        />
      ))}
    </div>
  );
}