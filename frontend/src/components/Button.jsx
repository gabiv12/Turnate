import React from 'react';

export default function Button({ children, onClick, type = "button", className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-gradient-to-r from-blue-600 to-cyan-400 shadow-lg mt-6 p-2 text-white rounded-lg w-full hover:scale-101 hover:from-cyan-400 hover:to-blue-600 transition duration-300 ease-in-out ${className}`}
    >
      {children}
    </button>
  );
}