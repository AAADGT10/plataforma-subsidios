import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Autenticación
export const registrarUsuario = (data) => API.post('/auth/registro', data);
export const loginUsuario = (data) => API.post('/auth/login', data);

// Subsidios (Administrador)
export const getSubsidios = () => API.get('/subsidios');
export const crearSubsidio = (data) => API.post('/subsidios', data);

// Motor de Evaluador y Notificaciones
export const ejecutarEvaluador = () => API.post('/evaluar');
export const getNotificaciones = (usuarioId) => API.get(`/evaluar/notificaciones/${usuarioId}`);

export default API;