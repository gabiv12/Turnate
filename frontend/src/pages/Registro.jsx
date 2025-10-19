// src/pages/Registro.jsx
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Input from "../components/Input";
import Loader from "../components/Loader";

// Si la imagen está en public/images, usá la ruta absoluta:
const sideImg = "/images/mujer-que-trabaja-oficina-casa.jpg";

export default function Registro() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    rol: "cliente",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const onChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // 👇 OJO: solo crea — NO inicia sesión
      await axios.post("http://127.0.0.1:8000/usuarios/", formData);

      // limpiamos y forzamos ir a login
      setFormData({ email: "", username: "", password: "", rol: "cliente" });

      // ✅ redirige al login con aviso
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      if (err?.response?.data) {
        const firstError = Object.values(err.response.data).flat()[0];
        setError(firstError || "No se pudo crear la cuenta.");
      } else {
        setError("No se pudo crear la cuenta.");
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <Loader />}

      {/* Layout sin “franja” blanca: full alto, banner degradé */}
      <section className="min-h-screen w-full bg-gradient-to-b from-blue-600 to-cyan-400 grid place-items-center px-4 py-10">
        <div className="w-full max-w-5xl">
          {/* marco con degradé */}
          <div className="rounded-3xl p-[1px] bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-400 shadow-2xl">
            {/* interior glass */}
            <div className="rounded-3xl bg-white/90 backdrop-blur-md">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Lado imagen */}
                <div className="relative min-h-[clamp(100px,70svh,220px)] md:min-h-[clamp(240px,60dvh,480px)] max-h-[92svh] overflow-y-auto">
                  <img
                    src={sideImg}
                    alt="Emprender con Turnate"
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-sky-700/60 via-sky-600/40 to-cyan-500/30 mix-blend-multiply" />
                  <div className="relative h-full flex items-end md:items-center">
                    <div className="p-6 md:p-10 text-white drop-shadow">
                      <h2 className="text-xl md:text-2xl font-semibold leading-tight">
                        Agregá tu emprendimiento
                        <br /> y tomá control de tus turnos
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Lado formulario */}
                <div className="p-6 md:p-10">
                  <header className="mb-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 px-3 py-1 text-xs font-medium text-white">
                      Nuevo usuario
                    </div>
                    <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900">
                      Crear una cuenta
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                      ¿Ya tenés cuenta?{" "}
                      <Link
                        to="/login"
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        Iniciar sesión
                      </Link>
                    </p>
                  </header>

                  {error && (
                    <div className="mb-4 rounded-xl bg-red-50 text-red-700 text-sm px-4 py-2 ring-1 ring-red-200">
                      {error}
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="grid gap-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Correo electrónico
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={onChange}
                        placeholder="tu@email.com"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="username"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Usuario
                      </label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={onChange}
                        placeholder="ej: fer_emprende"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-slate-700 mb-1"
                      >
                        Contraseña
                      </label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={onChange}
                        placeholder="••••••••"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>

                    {/* rol oculto (cliente por defecto) */}
                    <input type="hidden" name="rol" value={formData.rol} />

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 text-white font-semibold shadow hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60"
                    >
                      Crear cuenta
                    </Button>

                    <p className="text-[11px] text-slate-500 mt-1">
                      Al registrarte aceptás nuestros{" "}
                      <Link
                        to="/terminos"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Términos y Condiciones
                      </Link>{" "}
                      y la{" "}
                      <Link
                        to="/privacidad"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Política de Privacidad
                      </Link>
                      .
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>

          
        </div>
      </section>
    </>
  );
}
