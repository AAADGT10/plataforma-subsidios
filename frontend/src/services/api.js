import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Interceptor para inyectar token JWT automáticamente
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const loginUsuario = (datos) => API.post('/auth/login', datos);
export const registrarUsuario = (datos) => API.post('/auth/registro', datos);
export const actualizarPerfilUsuario = (id, datos) => API.put(`/auth/perfil/${id}`, datos);
export const buscarCiudadanoPorCedula = (cedula) => API.get(`/auth/buscar/${cedula}`);

export const getSubsidios = () => API.get('/subsidios');
export const crearSubsidio = (datos) => API.post('/subsidios', datos);

export const ejecutarEvaluador = () => API.post('/evaluador/ejecutar');
export const getNotificaciones = (usuarioId) => API.get(`/evaluador/notificaciones/${usuarioId}`);

export default API;