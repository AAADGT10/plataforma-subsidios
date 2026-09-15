import React, { useState, useEffect } from 'react';
import { getSubsidios, crearSubsidio, ejecutarEvaluador, buscarCiudadanoPorCedula } from '../services/api';
import api from '../services/api';

export default function AdminPanel({ onLogout }) {
  const [subsidios, setSubsidios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cupos, setCupos] = useState('');
  const [criterios, setCriterios] = useState([{ campo: 'sisben_grupo', operador: '<=', valor: 'B4' }]);

  // Estados para la Búsqueda de Ciudadanos
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [resultadoCiudadano, setResultadoCiudadano] = useState(null);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  // Generadores automáticos basados en la metodología oficial de Sisbén IV
  const gruposSisben = [
    ...Array.from({ length: 5 }, (_, i) => `A${i + 1}`),
    ...Array.from({ length: 7 }, (_, i) => `B${i + 1}`),
    ...Array.from({ length: 18 }, (_, i) => `C${i + 1}`),
    ...Array.from({ length: 20 }, (_, i) => `D${i + 1}`)
  ];

  const cargarSubsidios = async () => {
    try {
      const res = await getSubsidios();
      setSubsidios(res.data);
    } catch (err) {
      console.error('Error al cargar subsidios', err);
    }
  };

  useEffect(() => {
    cargarSubsidios();
  }, []);

  const agregarCriterio = () => {
    setCriterios([...criterios, { campo: 'sisben_grupo', operador: '<=', valor: 'B4' }]);
  };

  const actualizarCriterio = (index, campo, valor) => {
    const nuevosCriterios = [...criterios];
    nuevosCriterios[index][campo] = valor;

    if (campo === 'campo') {
      if (valor === 'sisben_grupo') nuevosCriterios[index].valor = 'B4';
      else if (valor === 'zona') nuevosCriterios[index].valor = 'Urbana';
      else if (valor === 'edad') nuevosCriterios[index].valor = '18';
    }

    setCriterios(nuevosCriterios);
  };

  const eliminarCriterio = (index) => {
    const nuevosCriterios = criterios.filter((_, i) => i !== index);
    setCriterios(nuevosCriterios);
  };

  const manejarGuardar = async (e) => {
    e.preventDefault();
    try {
      await crearSubsidio({
        nombre,
        descripcion,
        cupos: parseInt(cupos),
        criterios
      });
      alert('Subsidio creado exitosamente');
      setNombre('');
      setDescripcion('');
      setCupos('');
      setCriterios([{ campo: 'sisben_grupo', operador: '<=', valor: 'B4' }]);
      cargarSubsidios();
    } catch (err) {
      alert('Error al crear el subsidio');
    }
  };

  const manejarEvaluacion = async () => {
    try {
      const res = await ejecutarEvaluador();
      alert(`Evaluación ejecutada con éxito. Se generaron ${res.data.notificacionesGeneradas} notificaciones.`);
    } catch (err) {
      alert('Error al ejecutar el motor de evaluación');
    }
  };

  const cambiarEstadoSubsidio = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'archivado' : 'activo';
    try {
      await api.patch(`/subsidios/${id}/estado`, { estado: nuevoEstado });
      cargarSubsidios();
    } catch (error) {
      console.error('Error al cambiar el estado del subsidio', error);
      alert('No se pudo cambiar el estado del programa');
    }
  };

  const manejarBuscarCiudadano = async (e) => {
    e.preventDefault();
    setErrorBusqueda('');
    setResultadoCiudadano(null);

    try {
      const res = await buscarCiudadanoPorCedula(cedulaBusqueda);
      setResultadoCiudadano(res.data);
    } catch (err) {
      setErrorBusqueda(err.response?.data?.error || 'Ciudadano no encontrado');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Botones de control superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onLogout && (
          <button 
            onClick={onLogout}
            style={{ 
              padding: '10px 16px', 
              background: '#EF4444', 
              color: '#FFFFFF', 
              fontWeight: '600', 
              border: 'none', 
              borderRadius: '10px', 
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
            🚪 Cerrar Sesión
          </button>
        )}

        <button 
          onClick={manejarEvaluacion} 
          style={{ 
            marginLeft: 'auto',
            padding: '10px 16px', 
            background: 'var(--accent-green)', 
            color: '#0f172a', 
            fontWeight: '600', 
            border: 'none', 
            borderRadius: '10px', 
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s ease'
          }}>
          ⚙️ Ejecutar Motor Proactivo
        </button>
      </div>

      {/* Módulo de Búsqueda */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Consultar Ciudadano por Cédula</h3>
        
        <form onSubmit={manejarBuscarCiudadano} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Ingrese el número de cédula..." 
            value={cedulaBusqueda} 
            onChange={(e) => setCedulaBusqueda(e.target.value)} 
            required 
            className="styled-input" 
            style={{ marginBottom: 0, flex: 1 }} 
          />
          <button type="submit" className="btn-main" style={{ width: '160px' }}>
            Buscar
          </button>
        </form>

        {errorBusqueda && (
          <p style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{errorBusqueda}</p>
        )}

        {resultadoCiudadano && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginBottom: '8px' }}>
              {resultadoCiudadano.usuario.nombre}
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div><strong>Cédula:</strong> {resultadoCiudadano.usuario.cedula}</div>
              <div><strong>Email:</strong> {resultadoCiudadano.usuario.email}</div>
              <div><strong>Grupo Sisbén:</strong> {resultadoCiudadano.usuario.sisben_grupo}</div>
              <div><strong>Zona:</strong> {resultadoCiudadano.usuario.zona}</div>
            </div>

            <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: 'var(--text-main)' }}>Subsidios Asignados por el Motor:</h5>
            {resultadoCiudadano.notificaciones.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sin asignaciones activas para este ciudadano.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resultadoCiudadano.notificaciones.map((n) => (
                  <div key={n.id} style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                    <strong style={{ color: 'var(--accent-green)' }}>{n.subsidio}</strong> - {n.mensaje}
                  </div>
                ))}
              </div>
            )}

            <a 
              href={`http://localhost:5000/api/pdf/descargar/${resultadoCiudadano.usuario.cedula}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '10px 16px',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: '600',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'background 0.2s'
              }}
            >
              📄 Descargar PDF de beneficiario
            </a>
          </div>
        )}
      </div>

      {/* Formulario de Creación de Subsidios */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Crear Nuevo Programa Social</h3>
        
        <form onSubmit={manejarGuardar}>
          <div className="input-group">
            <label className="input-label">Nombre del Subsidio</label>
            <input 
              type="text" 
              placeholder="Ej. Subsidio Adulto Mayor" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required 
              className="styled-input" 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Descripción del Programa</label>
            <input 
              type="text" 
              placeholder="Descripción breve del objetivo social" 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              required 
              className="styled-input" 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Cupos Disponibles</label>
            <input 
              type="number" 
              placeholder="Ej. 100" 
              value={cupos} 
              onChange={(e) => setCupos(e.target.value)} 
              required 
              className="styled-input" 
            />
          </div>

          {/* Criterios Dinámicos */}
          <div style={{ marginTop: '20px', marginBottom: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <label className="input-label" style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-main)' }}>
              Criterios Dinámicos de Elegibilidad
            </label>
            
            {criterios.map((criterio, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                
                <select 
                  value={criterio.campo} 
                  onChange={(e) => actualizarCriterio(index, 'campo', e.target.value)}
                  className="styled-input" 
                  style={{ flex: 1, marginBottom: 0 }}>
                  <option value="sisben_grupo">Grupo Sisbén</option>
                  <option value="zona">Zona de Residencia</option>
                  <option value="edad">Edad Ciudadano</option>
                </select>

                <select 
                  value={criterio.operador} 
                  onChange={(e) => actualizarCriterio(index, 'operador', e.target.value)}
                  className="styled-input" 
                  style={{ width: '90px', marginBottom: 0 }}>
                  <option value="<=">&lt;=</option>
                  <option value="=">=</option>
                  <option value=">=">&gt;=</option>
                </select>

                {criterio.campo === 'sisben_grupo' ? (
                  <select 
                    value={criterio.valor} 
                    onChange={(e) => actualizarCriterio(index, 'valor', e.target.value)}
                    className="styled-input" 
                    style={{ flex: 1, marginBottom: 0 }}>
                    {gruposSisben.map((grupo) => (
                      <option key={grupo} value={grupo}>{grupo}</option>
                    ))}
                  </select>
                ) : criterio.campo === 'zona' ? (
                  <select 
                    value={criterio.valor} 
                    onChange={(e) => actualizarCriterio(index, 'valor', e.target.value)}
                    className="styled-input" 
                    style={{ flex: 1, marginBottom: 0 }}>
                    <option value="Urbana">Urbana</option>
                    <option value="Rural">Rural</option>
                  </select>
                ) : (
                  <input 
                    type="number" 
                    placeholder="Ej. 18, 60" 
                    value={criterio.valor} 
                    onChange={(e) => actualizarCriterio(index, 'valor', e.target.value)} 
                    required 
                    className="styled-input" 
                    style={{ flex: 1, marginBottom: 0 }} 
                  />
                )}

                {criterios.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => eliminarCriterio(index)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '18px', padding: '0 8px' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button 
              type="button" 
              onClick={agregarCriterio} 
              style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--primary)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginTop: '8px' }}>
              + Agregar Criterio
            </button>
          </div>

          <button type="submit" className="btn-main" style={{ marginTop: '12px' }}>
            Guardar Programa Social
          </button>
        </form>
      </div>

      {/* Lista de Subsidios */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Programas Sociales Registrados</h3>
        
        {subsidios.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay programas creados aún.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {subsidios.map((s) => (
              <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{s.nombre}</strong>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      background: s.estado === 'archivado' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: s.estado === 'archivado' ? '#EF4444' : '#22C55E',
                      border: s.estado === 'archivado' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                      {s.estado || 'activo'}
                    </span>
                  </div>
                  
                  <span style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    Cupos: {s.cupos}
                  </span>
                </div>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>{s.descripcion}</p>
                
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Criterios:</span>
                  {Array.isArray(s.criterios) && s.criterios.length > 0 ? (
                    s.criterios.map((c, idx) => (
                      <span key={idx} style={{ fontSize: '11px', background: '#334155', color: '#f8fafc', padding: '3px 8px', borderRadius: '6px' }}>
                        {c.campo_evaluar || c.campo} {c.operador} {c.valor_referencia || c.valor}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin criterios</span>
                  )}
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <a 
                    href={`http://localhost:5000/api/subsidios/${s.id}/pdf-beneficiarios`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: '#0284c7',
                      color: '#ffffff',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    📥 Descargar Listado Oficial (PDF)
                  </a>

                  <button 
                    onClick={() => cambiarEstadoSubsidio(s.id, s.estado || 'activo')}
                    style={{
                      padding: '6px 12px',
                      background: s.estado === 'archivado' ? '#059669' : '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    {s.estado === 'archivado' ? 'Reactivar Subsidio' : 'Archivar Subsidio'}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}