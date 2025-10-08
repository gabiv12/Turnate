import React from "react";

const Input = ({
  id,
  label,
  ...props // acepta todas las props extra
}) => {
  return (
    <div className="flex flex-col">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 dark:text-black text-lg"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        {...props} // pasa todas las props al input
        className={`border p-3 dark:bg-white dark:text-gray-700 dark:border-gray-800 shadow-md placeholder:text-base focus:scale-105 ease-in-out duration-300 border-blue-800 rounded-lg w-full ${props.className || ""}`}
      />
    </div>
  );
};

export default Input;