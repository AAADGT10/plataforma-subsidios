import React, { useState } from 'react';
import AdminPanel from './components/AdminPanel';
import CiudadanoPanel from './components/CiudadanoPanel';

function App() {
  const [vista, setVista] = useState('ciudadano');
  const [usuarioSesion, setUsuarioSesion] = useState(null);

  const manejarLogin = (usuario, token) => {
    setUsuarioSesion(usuario);
    localStorage.setItem('token', token);
    if (usuario.rol === 'admin') {
      setVista('admin');
    } else {
      setVista('ciudadano');
    }
  };

  const manejarLogout = () => {
    setUsuarioSesion(null);
    localStorage.removeItem('token');
    setVista('ciudadano');
  };

  const esAdmin = usuarioSesion?.rol === 'admin';

  return (
    <div>
      {/* Header Superior Limpio */}
      <header style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)', padding: '16px 40px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }}></div>
            <h1 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>Alcaldía de Valencia</h1>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Focalización Social</span>
          </div>

          <nav style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setVista('ciudadano')} 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid',
                borderColor: vista === 'ciudadano' ? 'var(--primary)' : 'transparent',
                background: vista === 'ciudadano' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                color: vista === 'ciudadano' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}>
              Portal Ciudadano
            </button>
            
            {esAdmin && (
              <button 
                onClick={() => setVista('admin')} 
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '1px solid',
                  borderColor: vista === 'admin' ? 'var(--primary)' : 'transparent',
                  background: vista === 'admin' ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                  color: vista === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}>
                Panel Administrador
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Cuerpo Central */}
      <main className="app-container">
        {vista === 'admin' && esAdmin ? (
          <AdminPanel />
        ) : (
          <CiudadanoPanel 
            onLogin={manejarLogin} 
            usuarioSesion={usuarioSesion} 
            onLogout={manejarLogout} 
          />
        )}
      </main>
    </div>
  );
}

export default App;