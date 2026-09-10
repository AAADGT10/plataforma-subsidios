const express = require('express');
const router = express.Router();
const pool = require('../db');

// Función auxiliar para calcular edad exacta a partir de la fecha de nacimiento
const calcularEdad = (fechaNacimiento) => {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

// Función dinámica para comparar valores según el operador
const evaluarRegla = (valorUsuario, operador, valorReferencia) => {
  switch (operador) {
    case '=':
      return String(valorUsuario).toLowerCase() === String(valorReferencia).toLowerCase();
    case '<=':
      return String(valorUsuario).localeCompare(String(valorReferencia), undefined, { numeric: true }) <= 0;
    case '>=':
      return Number(valorUsuario) >= Number(valorReferencia);
    case '>':
      return Number(valorUsuario) > Number(valorReferencia);
    case '<':
      return Number(valorUsuario) < Number(valorReferencia);
    default:
      return false;
  }
};

// POST /api/evaluar - Ejecuta el cruce proactivo de todos los ciudadanos contra los subsidios
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Obtener todos los ciudadanos y los subsidios activos con sus criterios
    const [usuarios] = await connection.query("SELECT * FROM usuarios WHERE rol = 'ciudadano'");
    const [subsidios] = await connection.query("SELECT * FROM subsidios WHERE estado = 'activo'");
    const [criterios] = await connection.query("SELECT * FROM criterios_subsidio");

    let notificacionesGeneradas = 0;

    for (const usuario of usuarios) {
      const edadUsuario = calcularEdad(usuario.fecha_nacimiento);

      for (const subsidio of subsidios) {
        const reglas = criterios.filter(c => c.subsidio_id === subsidio.id);
        
        // Verificar si el usuario cumple TODAS las reglas dinámicas del subsidio
        const cumpleTodasLasReglas = reglas.every(regla => {
          let valorAEvaluar;
          if (regla.campo_evaluar === 'edad') {
            valorAEvaluar = edadUsuario;
          } else {
            valorAEvaluar = usuario[regla.campo_evaluar];
          }
          return evaluarRegla(valorAEvaluar, regla.operador, regla.valor_referencia);
        });

        // Si es apto, insertamos la notificación (evitando duplicados)
        if (cumpleTodasLasReglas) {
          const [existente] = await connection.query(
            'SELECT id FROM notificaciones WHERE usuario_id = ? AND subsidio_id = ?',
            [usuario.id, subsidio.id]
          );

          if (existente.length === 0) {
            await connection.query(
              'INSERT INTO notificaciones (usuario_id, subsidio_id, mensaje) VALUES (?, ?, ?)',
              [
                usuario.id,
                subsidio.id,
                `¡Hola ${usuario.nombre}! Cumples con los requisitos para acceder al programa: ${subsidio.nombre}.`
              ]
            );
            notificacionesGeneradas++;
          }
        }
      }
    }

    await connection.commit();
    res.json({ mensaje: 'Evaluación masiva completada', notificacionesGeneradas });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Error en el proceso de focalización', detalle: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/evaluar/notificaciones/:usuarioId - Consultar notificaciones de un usuario
router.get('/notificaciones/:usuarioId', async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const [notificaciones] = await pool.query(
      `SELECT n.id, s.nombre AS subsidio, n.mensaje, n.fecha_notificacion, n.leido 
       FROM notificaciones n 
       JOIN subsidios s ON n.subsidio_id = s.id 
       WHERE n.usuario_id = ?`,
      [usuarioId]
    );
    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar notificaciones', detalle: error.message });
  }
});

module.exports = router;