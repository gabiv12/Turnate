import React, { useEffect, useState } from "react";
import TurnosList from "./TurnosList";

export default function TurnosEmprendedor() {
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    // TODO: reemplazar con fetch real al backend
    setTurnos([
      { id: 1, fecha: "2025-09-22", hora: "10:00", estado: "Disponible" },
      { id: 2, fecha: "2025-09-22", hora: "11:00", estado: "Reservado" },
    ]);
  }, []);

  const handleEditar = (id) => {
    alert(`Editar turno con id: ${id}`);
    // Aquí abrirías un modal o form para editar
  };

  const handleEliminar = (id) => {
    setTurnos(turnos.filter((t) => t.id !== id));
    // También mandar DELETE al backend
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Gestión de Turnos</h2>
      <button className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
        Crear Turno
      </button>

      <TurnosList
        turnos={turnos}
        onEditar={handleEditar}
        onEliminar={handleEliminar}
        isCliente={false}
      />
    </div>
  );
}