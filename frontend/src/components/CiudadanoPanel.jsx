import React, { useState, useEffect } from 'react';
import { loginUsuario, registrarUsuario, getNotificaciones } from '../services/api';

export default function CiudadanoPanel({ onLogin, usuarioSesion, onLogout }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [esRegistro, setEsRegistro] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sisben, setSisben] = useState('A1');
  const [zona, setZona] = useState('Urbana');

  const limpiarCampos = () => {
    setEmail('');
    setPassword('');
    setCedula('');
    setNombre('');
    setFechaNacimiento('');
  };

  const cargarNotificaciones = async (id) => {
    try {
      const res = await getNotificaciones(id);
      setNotificaciones(res.data);
    } catch (err) {
      console.error('Error al cargar notificaciones', err);
    }
  };

  useEffect(() => {
    if (usuarioSesion) {
      cargarNotificaciones(usuarioSesion.id);
    }
  }, [usuarioSesion]);

  const manejarAuth = async (e) => {
    e.preventDefault();
    try {
      if (esRegistro) {
        await registrarUsuario({
          cedula, nombre, email, password,
          fecha_nacimiento: fechaNacimiento,
          sisben_grupo: sisben,
          zona
        });
        alert('Registro exitoso. Inicia sesión.');
        limpiarCampos();
        setEsRegistro(false);
      } else {
        const res = await loginUsuario({ email, password });
        limpiarCampos();
        onLogin(res.data.usuario, res.data.token);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error de autenticación');
      setPassword('');
    }
  };

  if (usuarioSesion) {
    return (
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700' }}>{usuarioSesion.nombre}</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'inline-block', marginTop: '6px' }}>
              Rol: {usuarioSesion.rol}
            </span>
          </div>
          <button onClick={onLogout} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
            Cerrar Sesión
          </button>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Notificaciones de Beneficios</h3>
        
        {notificaciones.length === 0 ? (
          <div style={{ textStyle: 'center', padding: '32px', border: '1px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No tienes notificaciones pendientes por el momento.</p>
          </div>
        ) : (
          notificaciones.map((n) => (
            <div key={n.id} style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '20px', borderRadius: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--accent-green)', fontSize: '16px' }}>{n.subsidio}</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(n.fecha_notificacion).toLocaleDateString()}</span>
              </div>
              <p style={{ color: 'var(--text-main)', marginTop: '8px', fontSize: '14px', lineHeight: '1.5' }}>{n.mensaje}</p>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '420px', margin: '40px auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '22px', fontWeight: '700' }}>
        {esRegistro ? 'Crear Cuenta' : 'Ingreso al Sistema'}
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>
        {esRegistro ? 'Ingresa tus datos para validar tu perfil social' : 'Accede con tu cuenta institucional'}
      </p>

      <form onSubmit={manejarAuth} autoComplete="off">
        {esRegistro && (
          <>
            <div className="input-group">
              <label className="input-label">Número de Cédula</label>
              <input type="text" placeholder="Ej: 1065111222" value={cedula} onChange={(e) => setCedula(e.target.value)} required className="styled-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Nombre Completo</label>
              <input type="text" placeholder="Ej: Marcos Pérez" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="styled-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Fecha de Nacimiento</label>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required className="styled-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Grupo Sisbén</label>
              <select value={sisben} onChange={(e) => setSisben(e.target.value)} className="styled-input">
                <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B4">B4</option><option value="C1">C1</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Zona de Residencia</label>
              <select value={zona} onChange={(e) => setZona(e.target.value)} className="styled-input">
                <option value="Urbana">Urbana</option><option value="Rural">Rural</option>
              </select>
            </div>
          </>
        )}

        <div className="input-group">
          <label className="input-label">Correo Electrónico</label>
          <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="styled-input" />
        </div>

        <div className="input-group">
          <label className="input-label">Contraseña</label>
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="styled-input" />
        </div>

        <button type="submit" className="btn-main" style={{ marginTop: '12px' }}>
          {esRegistro ? 'Registrarse' : 'Iniciar Sesión'}
        </button>
      </form>

      <button onClick={() => { setEsRegistro(!esRegistro); limpiarCampos(); }} className="btn-link">
        {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
      </button>
    </div>
  );
}