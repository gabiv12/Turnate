import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MensajeCreado(message) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login"); // Cambia por tu ruta de login
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-cyan-400 min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Message Box */}
      <div className="bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-20 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
        
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl font-bold font-semibold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent mb-2">¡Usuario creado con éxito!</h1>
        <p className="font-semibold bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent mb-4">Serás redirigido a Login en unos segundos...</p>
      </div>
    </div>
  );
}