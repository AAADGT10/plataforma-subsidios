import React, { useState, useEffect } from 'react';
import AdminPanel from './components/AdminPanel';
import api from './services/api';

export default function App() {
  const [isAutenticado, setIsAutenticado] = useState(() => {
    return !!localStorage.getItem('token');
  });

  const [usuarioActual, setUsuarioActual] = useState(() => {
    const userGuardado = localStorage.getItem('usuario');
    return userGuardado ? JSON.parse(userGuardado) : null;
  });

  const [vistaActual, setVistaActual] = useState(() => {
    const user = localStorage.getItem('usuario');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.rol === 'admin' ? 'admin' : 'ciudadano';
      } catch (e) {
        return 'admin';
      }
    }
    return 'login';
  });

  const [modoRegistro, setModoRegistro] = useState(false);

  // Estados para Login
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  // Estados para Registro Ciudadano
  const [regCedula, setRegCedula] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFechaNac, setRegFechaNac] = useState('');
  const [regSisben, setRegSisben] = useState('A1');
  const [regZona, setRegZona] = useState('Urbana');
  const [mensajeRegistro, setMensajeRegistro] = useState('');

  // Estado para el Modal Elegante de Éxito en Registro
  const [modalRegistroExitoso, setModalRegistroExitoso] = useState(false);

  // Lista completa de grupos de Sisbén IV oficiales (A1-A5, B1-B7, C1-C18, D1-D20)
  const gruposSisbenOficiales = [
    ...Array.from({ length: 5 }, (_, i) => `A${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `B${i + 1}`),
    ...Array.from({ length: 18 }, (_, i) => `C${i + 1}`),
    ...Array.from({ length: 20 }, (_, i) => `D${i + 1}`)
  ];

  // Estados del Portal Ciudadano (para el usuario logueado)
  const [datosCiudadanoPortal, setDatosCiudadanoPortal] = useState(null);
  const [cargandoPortal, setCargandoPortal] = useState(false);

  useEffect(() => {
    if (isAutenticado && usuarioActual && usuarioActual.rol !== 'admin') {
      cargarDatosPortal(usuarioActual.cedula);
    }
  }, [isAutenticado, usuarioActual]);

  const cargarDatosPortal = async (cedula) => {
    setCargandoPortal(true);
    try {
      const res = await api.get(`/auth/buscar/${cedula}`);
      setDatosCiudadanoPortal(res.data);
    } catch (err) {
      console.error('Error al cargar datos del ciudadano', err);
    } finally {
      setCargandoPortal(false);
    }
  };

  const manejarLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');

    try {
      const response = await api.post('/auth/login', {
        email: emailInput,
        password: passwordInput
      });

      const { token, usuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      setIsAutenticado(true);
      setUsuarioActual(usuario);
      setVistaActual(usuario.rol === 'admin' ? 'admin' : 'ciudadano');
    } catch (err) {
      setErrorLogin(err.response?.data?.error || 'Credenciales incorrectas o error en el servidor.');
    }
  };

  const manejarRegistro = async (e) => {
    e.preventDefault();
    setMensajeRegistro('');

    try {
      await api.post('/auth/registro', {
        cedula: regCedula,
        nombre: regNombre,
        email: regEmail,
        password: regPassword,
        fecha_nacimiento: regFechaNac,
        sisben_grupo: regSisben,
        zona: regZona,
        rol: 'ciudadano'
      });

      // Activamos el modal elegante en lugar del alert()
      setModalRegistroExitoso(true);
    } catch (err) {
      setMensajeRegistro(err.response?.data?.error || 'Error al registrarse.');
    }
  };

  const cerrarModalRegistro = () => {
    setModalRegistroExitoso(false);
    setModoRegistro(false);
    setEmailInput(regEmail);
    setPasswordInput(regPassword);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setIsAutenticado(false);
    setUsuarioActual(null);
    setVistaActual('login');
  };

  // Pantalla de Autenticación / Registro
  if (!isAutenticado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '440px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>Alcaldía de Valencia</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Portal de Focalización Social</p>
          </div>

          {!modoRegistro ? (
            /* FORMULARIO DE LOGIN */
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#38bdf8' }}>Iniciar Sesión</h3>
              
              {errorLogin && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                  {errorLogin}
                </div>
              )}

              <form onSubmit={manejarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                    placeholder="correo@dominio.com"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Contraseña</label>
                  <input 
                    type="password" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', marginTop: '6px' }}>
                  Ingresar
                </button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                  ¿No tienes cuenta de ciudadano?{' '}
                  <button 
                    onClick={() => setModoRegistro(true)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' }}>
                    Regístrate aquí
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* FORMULARIO DE REGISTRO */
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#38bdf8' }}>Registro Ciudadano</h3>

              {mensajeRegistro && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                  {mensajeRegistro}
                </div>
              )}

              <form onSubmit={manejarRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>N.º Documento</label>
                  <input type="text" value={regCedula} onChange={(e) => setRegCedula(e.target.value)} placeholder="Número de cédula o tarjeta..." style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nombre Completo</label>
                  <input type="text" value={regNombre} onChange={(e) => setRegNombre(e.target.value)} placeholder="Nombres y Apellidos" style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Correo Electrónico</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="correo@dominio.com" style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} required />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Contraseña</label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>F. Nacimiento</label>
                    <input type="date" value={regFechaNac} onChange={(e) => setRegFechaNac(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Grupo Sisbén</label>
                    <select value={regSisben} onChange={(e) => setRegSisben(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                      {gruposSisbenOficiales.map((grupo) => (
                        <option key={grupo} value={grupo}>{grupo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Zona</label>
                  <select value={regZona} onChange={(e) => setRegZona(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                    <option value="Urbana">Urbana</option>
                    <option value="Rural">Rural</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>
                  Completar Registro
                </button>
              </form>

              <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                <button 
                  onClick={() => setModoRegistro(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}>
                  ← Volver al inicio de sesión
                </button>
              </div>
            </div>
          )}

          {/* Modal / Popup Elegante de Éxito en Registro */}
          {modalRegistroExitoso && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '30px',
                borderRadius: '16px',
                textAlign: 'center',
                maxWidth: '380px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginBottom: '12px', 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  width: '64px', 
                  height: '64px', 
                  lineHeight: '64px', 
                  borderRadius: '50%', 
                  margin: '0 auto 16px auto',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  ✅
                </div>
                
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>
                  ¡Registro Exitoso!
                </h3>
                
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>
                  Tu información ha sido registrada correctamente. Ahora puedes iniciar sesión con tu correo y contraseña.
                </p>

                <button 
                  onClick={cerrarModalRegistro}
                  style={{ background: '#38bdf8', color: '#0f172a', border: 'none', width: '100%', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Iniciar Sesión
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // Interfaz de Usuario Autenticado (Administrador o Ciudadano)
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header General */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 32px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>Alcaldía de Valencia</h1>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>| Focalización Social</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Hola, <strong style={{ color: '#fff' }}>{usuarioActual?.nombre}</strong> ({usuarioActual?.rol})
          </span>

          {usuarioActual?.rol === 'admin' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setVistaActual('admin')}
                style={{ background: vistaActual === 'admin' ? '#38bdf8' : 'transparent', color: vistaActual === 'admin' ? '#0f172a' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                Panel Admin
              </button>
            </div>
          )}

          <button 
            onClick={cerrarSesion}
            style={{ background: '#EF4444', border: 'none', color: '#FFFFFF', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            Cerrar Sesión
          </button>
        </div>

      </header>

      {/* Contenido según el rol y vista */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {usuarioActual?.rol === 'admin' && vistaActual === 'admin' ? (
          <AdminPanel onLogout={cerrarSesion} />
        ) : (
          /* PORTAL CIUDADANO ACTIVO */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#38bdf8', marginBottom: '8px' }}>Mi Perfil Ciudadano</h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Consulta tu información de Sisbén, zona y los programas sociales a los que has sido focalizado.</p>

              {cargandoPortal ? (
                <p style={{ color: '#94a3b8' }}>Cargando información...</p>
              ) : datosCiudadanoPortal ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px', background: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>N.º Documento</span>
                      <strong style={{ fontSize: '14px' }}>{datosCiudadanoPortal.usuario.cedula}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Correo</span>
                      <strong style={{ fontSize: '14px' }}>{datosCiudadanoPortal.usuario.email}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Grupo Sisbén</span>
                      <strong style={{ fontSize: '14px', color: '#38bdf8' }}>{datosCiudadanoPortal.usuario.sisben_grupo}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Zona</span>
                      <strong style={{ fontSize: '14px' }}>{datosCiudadanoPortal.usuario.zona}</strong>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Notificaciones y Subsidios Asignados</h3>
                  
                  {datosCiudadanoPortal.notificaciones.length === 0 ? (
                    <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', color: '#94a3b8', fontSize: '13px' }}>
                      No tienes notificaciones o subsidios asignados por el momento. El motor de focalización te avisará cuando cumplas los requisitos de algún programa social.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {datosCiudadanoPortal.notificaciones.map((n) => (
                        <div key={n.id} style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '14px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ color: '#22C55E', fontSize: '14px' }}>{n.subsidio}</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(n.fecha_notificacion).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: '13px', color: '#f8fafc', margin: 0 }}>{n.mensaje}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '20px' }}>
                    <a 
                      href={`http://localhost:5000/api/pdf/descargar/${datosCiudadanoPortal.usuario.cedula}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '10px 16px',
                        background: '#16a34a',
                        color: '#ffffff',
                        fontWeight: '600',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '13px'
                      }}
                    >
                      📄 Descargar Certificado de Beneficiario (PDF)
                    </a>
                  </div>

                </div>
              ) : (
                <p style={{ color: '#ef4444' }}>No se pudieron cargar los datos del perfil.</p>
              )}
            </div>
          </div>
        )}
      </main>

    </div>
  );
}