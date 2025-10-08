import React from "react";

export default function TurnoCard({ turno, onReservar, onEditar, onEliminar, isCliente }) {
  return (
    <div className="border rounded-lg shadow p-4 bg-white flex flex-col gap-2">
      <p><strong>Fecha:</strong> {turno.fecha}</p>
      <p><strong>Hora:</strong> {turno.hora}</p>
      <p><strong>Estado:</strong> {turno.estado}</p>

      <div className="flex gap-2 mt-2">
        {isCliente ? (
          <button
            onClick={() => onReservar(turno.id)}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Reservar
          </button>
        ) : (
          <>
            <button
              onClick={() => onEditar(turno.id)}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            >
              Editar
            </button>
            <button
              onClick={() => onEliminar(turno.id)}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  );
}