import React, { useState, useEffect } from 'react';
import { getSubsidios, crearSubsidio, ejecutarEvaluador } from '../services/api';

export default function AdminPanel() {
  const [subsidios, setSubsidios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cupos, setCupos] = useState('');
  const [criterios, setCriterios] = useState([{ campo: 'sisben_grupo', operador: '<=', valor: 'B4' }]);

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
    setCriterios([...criterios, { campo: 'sisben_grupo', operador: '<=', valor: '' }]);
  };

  const actualizarCriterio = (index, campo, valor) => {
    const nuevosCriterios = [...criterios];
    nuevosCriterios[index][campo] = valor;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header del Panel de Administración */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Panel de Administración</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Gestión de programas y motor de focalización</p>
        </div>
        <button 
          onClick={manejarEvaluacion} 
          style={{ 
            padding: '10px 18px', 
            background: 'var(--accent-green)', 
            color: '#0f172a', 
            fontWeight: '600', 
            border: 'none', 
            borderRadius: '10px', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
          ⚙️ Ejecutar Motor Proactivo
        </button>
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

                <input 
                  type="text" 
                  placeholder="Valor (ej. B4, Rural, 60)" 
                  value={criterio.valor} 
                  onChange={(e) => actualizarCriterio(index, 'valor', e.target.value)} 
                  required 
                  className="styled-input" 
                  style={{ flex: 1, marginBottom: 0 }} 
                />

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

      {/* Lista de Subsidios Activos */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Subsidios Activos</h3>
        
        {subsidios.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay programas creados aún.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {subsidios.map((s) => (
              <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>{s.nombre}</strong>
                  <span style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    Cupos: {s.cupos}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>{s.descripcion}</p>
                
                {/* Formato limpio de Criterios */}
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

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}