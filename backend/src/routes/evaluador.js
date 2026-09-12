const express = require('express');
const router = express.Router();

let db;
try {
  db = require('../db');
} catch (e) {
  try {
    db = require('../config/db');
  } catch (err) {
    db = require('../../db');
  }
}

// Ejecutar Motor Proactivo de Subsidios
router.post('/ejecutar', async (req, res) => {
  try {
    // 1. Obtener todos los subsidios activos
    const [subsidios] = await db.query('SELECT * FROM subsidios');
    
    // 2. Obtener todos los ciudadanos registrados
    const [usuarios] = await db.query("SELECT * FROM usuarios WHERE rol = 'ciudadano'");

    let notificacionesGeneradas = 0;

    for (const subsidio of subsidios) {
      let criterios = [];
      try {
        criterios = typeof subsidio.criterios === 'string' ? JSON.parse(subsidio.criterios) : subsidio.criterios;
      } catch (e) {
        criterios = [];
      }

      for (const usuario of usuarios) {
        let cumple = true;

        if (Array.isArray(criterios)) {
          for (const c of criterios) {
            const campo = c.campo_evaluar || c.campo;
            const operador = c.operador;
            const valorRef = c.valor_referencia || c.valor;
            const valorUser = usuario[campo];

            if (valorUser === undefined) {
              cumple = false;
              break;
            }

            if (operador === '=' && String(valorUser).trim() !== String(valorRef).trim()) {
              cumple = false;
              break;
            }
            if (operador === '<=' && String(valorUser) > String(valorRef)) {
              cumple = false;
              break;
            }
            if (operador === '>=' && String(valorUser) < String(valorRef)) {
              cumple = false;
              break;
            }
          }
        }

        if (cumple) {
          // Verificar si ya existe una notificación para este usuario y subsidio para evitar duplicados
          const [existente] = await db.query(
            'SELECT id FROM notificaciones WHERE usuario_id = ? AND subsidio_id = ?',
            [usuario.id, subsidio.id]
          );

          if (existente.length === 0) {
            const mensaje = `¡Hola ${usuario.nombre}! Cumples con los requisitos para acceder al programa: ${subsidio.nombre}.`;
            await db.query(
              'INSERT INTO notificaciones (usuario_id, subsidio_id, mensaje, fecha_notificacion) VALUES (?, ?, ?, NOW())',
              [usuario.id, subsidio.id, mensaje]
            );
            notificacionesGeneradas++;
          }
        }
      }
    }

    res.json({ 
      mensaje: 'Evaluación proactiva ejecutada correctamente', 
      notificacionesGeneradas 
    });
  } catch (error) {
    console.error('Error detallado al ejecutar el evaluador:', error);
    res.status(500).json({ error: 'Error interno al ejecutar el motor de evaluación' });
  }
});

module.exports = router;