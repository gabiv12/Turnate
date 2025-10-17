// src/services/servicios.js
import api from './api';

// Lista solo los del emprendedor logueado
export const listarMisServicios = () => api.get('/servicios/mis');

// Crear servicio
export const crearServicio = (data) => api.post('/servicios', data);

// Actualizar servicio (IMPORTANTE: usar PUT, no PATCH)
export const actualizarServicio = (id, data) => api.put(`/servicios/${id}`, data);

// Borrar servicio
export const eliminarServicio = (id) => api.delete(`/servicios/${id}`);

export default {
  listarMisServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
};
