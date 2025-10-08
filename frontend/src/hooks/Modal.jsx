import React from "react";

export default function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose} // clic afuera cierra
    >
      <div
        className="bg-white rounded-xl shadow-lg p-5 max-w-md w-full"
        onClick={(e) => e.stopPropagation()} // evita cerrar al hacer clic adentro
      >
        {children}
      </div>
    </div>
  );
}
