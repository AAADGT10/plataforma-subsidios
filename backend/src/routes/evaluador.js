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

// Función auxiliar para dar un peso numérico real a los grupos del Sisbén
const obtenerPesoSisben = (grupo) => {
  if (!grupo) return 999;
  const g = String(grupo).trim().toUpperCase();
  const pesos = {
    'A1': 1, 'A2': 2, 'A3': 3, 'A4': 4,
    'B1': 5, 'B2': 6, 'B3': 7, 'B4': 8,
    'C1': 9, 'C2': 10, 'C3': 11, 'C4': 12,
    'D1': 13, 'D2': 14, 'D3': 15, 'D4': 16
  };
  return pesos[g] || 999;
};

// Función auxiliar para calcular la edad exacta en años a partir de una fecha de nacimiento
const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};

// Ejecutar Motor Proactivo de Subsidios
router.post('/ejecutar', async (req, res) => {
  try {
    const [subsidios] = await db.query('SELECT * FROM subsidios');
    const [usuarios] = await db.query("SELECT * FROM usuarios WHERE rol = 'ciudadano'");

    let notificacionesGeneradas = 0;

    for (const subsidio of subsidios) {
      const [criterios] = await db.query(
        'SELECT * FROM criterios_subsidio WHERE subsidio_id = ?',
        [subsidio.id]
      );

      if (!criterios || criterios.length === 0) continue;

      for (const usuario of usuarios) {
        let cumple = true;

        for (const c of criterios) {
          const campo = String(c.campo_evaluar).trim();
          const operador = String(c.operador).trim();
          const valorRef = c.valor_referencia;

          // Obtener el valor del usuario o calcularlo si es edad/fecha de nacimiento
          let valorUser;
          if (campo === 'edad') {
            valorUser = calcularEdad(usuario.fecha_nacimiento || usuario.edad);
          } else {
            valorUser = usuario[campo];
          }

          if (valorUser === undefined || valorUser === null) {
            cumple = false;
            break;
          }

          // ==========================================
          // EVALUACIÓN DE OPERADOR IGUAL (=)
          // ==========================================
          if (operador === '=') {
            const valUserStr = String(valorUser).trim().toLowerCase();
            const valRefStr = String(valorRef).trim().toLowerCase();
            
            if (valUserStr !== valRefStr) {
              cumple = false;
              break;
            }
          }
          
          // ==========================================
          // EVALUACIÓN DE MENOR O IGUAL (<=) o MENOR QUE (<)
          // ==========================================
          else if (operador === '<=' || operador === '<') {
            if (campo === 'sisben_grupo') {
              const pesoUser = obtenerPesoSisben(valorUser);
              const pesoRef = obtenerPesoSisben(valorRef);
              if (pesoUser > pesoRef) {
                cumple = false;
                break;
              }
            } else {
              const numUser = Number(valorUser);
              const numRef = Number(valorRef);
              const condicion = operador === '<=' ? (numUser > numRef) : (numUser >= numRef);
              if (condicion) {
                cumple = false;
                break;
              }
            }
          }

          // ==========================================
          // EVALUACIÓN DE MAYOR O IGUAL (>=) o MAYOR QUE (>)
          // ==========================================
          else if (operador === '>=' || operador === '>') {
            if (campo === 'sisben_grupo') {
              const pesoUser = obtenerPesoSisben(valorUser);
              const pesoRef = obtenerPesoSisben(valorRef);
              if (pesoUser < pesoRef) {
                cumple = false;
                break;
              }
            } else {
              const numUser = Number(valorUser);
              const numRef = Number(valorRef);
              const condicion = operador === '>=' ? (numUser < numRef) : (numUser <= numRef);
              if (condicion) {
                cumple = false;
                break;
              }
            }
          }
        }

        // Si cumple todos los criterios, generamos la notificación si no existe
        if (cumple) {
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
    res.status(500).json({ error: 'Error interno al ejecutar el motor de evaluación', detalle: error.message });
  }
});

module.exports = router;