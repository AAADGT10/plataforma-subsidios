const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Necesario para generar el token seguro de recuperación

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

// Registrar usuario
router.post('/registro', async (req, res) => {
  const { cedula, nombre, email, password, fecha_nacimiento, sisben_grupo, zona, rol } = req.body;

  try {
    const [existente] = await db.query('SELECT * FROM usuarios WHERE email = ? OR cedula = ?', [email, cedula]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe con ese correo o cédula' });
    }

    const hashedPassword = await bcrypt.hash(password || '123456', 10);
    const userRol = rol || 'ciudadano';

    const [result] = await db.query(
      'INSERT INTO usuarios (cedula, nombre, email, password, fecha_nacimiento, sisben_grupo, zona, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [cedula, nombre, email, hashedPassword, fecha_nacimiento, sisben_grupo, zona, userRol]
    );

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
  }
});

// Login híbrido
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];
    let passwordValido = false;

    if (usuario.password.startsWith('$2b$') || usuario.password.startsWith('$2a$')) {
      passwordValido = await bcrypt.compare(password, usuario.password);
    } else {
      if (usuario.password === password) {
        passwordValido = true;
        const newHash = await bcrypt.hash(password, 10);
        await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [newHash, usuario.id]);
      }
    }

    if (!passwordValido) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '8h' }
    );

    delete usuario.password;
    res.json({ token, usuario });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor durante el login' });
  }
});

// 1. SOLICITAR RECUPERACIÓN DE CONTRASEÑA (Localhost)
router.post('/recuperar-password', async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length === 0) {
      // Por seguridad respondemos con éxito genérico para no filtrar qué correos existen
      return res.json({ mensaje: 'Si el correo está registrado, se han generado las instrucciones de recuperación.' });
    }

    const usuario = rows[0];

    // Generar un token aleatorio y darle 15 minutos de vigencia
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, tokenExpires, usuario.id]
    );

    // Como trabajamos en localhost, imprimimos el token claramente en tu terminal de Node.js
    console.log('\n====================================================');
    console.log(`[RECUPERACIÓN DE CONTRASEÑA] Correo: ${email}`);
    console.log(`TOKEN DE ACCESO: ${resetToken}`);
    console.log('====================================================\n');

    res.json({ mensaje: 'Si el correo está registrado, se han generado las instrucciones de recuperación.' });
  } catch (error) {
    console.error('Error en recuperación:', error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

// 2. RESTABLECER CONTRASEÑA CON EL TOKEN
router.post('/restablecer-password', async (req, res) => {
  const { token, nuevaPassword } = req.body;

  console.log('\n--- INTENTO DE RESTABLECIMIENTO ---');
  console.log('Token recibido desde el frontend:', token);

  try {
    // 1. Busquemos primero SOLO por el token para ver si existe en la BD
    const [rowsToken] = await db.query(
      'SELECT id, email, reset_token, reset_token_expires FROM usuarios WHERE reset_token = ?',
      [token.trim()]
    );

    if (rowsToken.length === 0) {
      console.log('DIAGNÓSTICO: El token NO se encontró en la base de datos.');
      return res.status(400).json({ error: 'El token no existe en la base de datos.' });
    }

    const usuario = rowsToken[0];
    console.log('Usuario encontrado:', usuario.email);
    console.log('Fecha de expiración en BD:', usuario.reset_token_expires);
    console.log('Fecha actual evaluada:', new Date());

    // 2. Verificar si ya expiró
    if (new Date(usuario.reset_token_expires) < new Date()) {
      console.log('DIAGNÓSTICO: El token ha expirado.');
      return res.status(400).json({ error: 'El token ha expirado.' });
    }

    // Si pasa las validaciones, actualizamos
    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    await db.query(
      'UPDATE usuarios SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, usuario.id]
    );

    console.log('DIAGNÓSTICO: Contraseña actualizada con éxito.\n');
    res.json({ mensaje: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

// Actualizar datos del perfil
router.put('/perfil/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, cedula, email, password } = req.body;

  try {
    let campos = ['nombre = ?', 'cedula = ?', 'email = ?'];
    let valores = [nombre, cedula, email];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      campos.push('password = ?');
      valores.push(hashedPassword);
    }

    valores.push(id);

    const query = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
    await db.query(query, valores);

    res.json({ mensaje: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar la información del usuario en la base de datos' });
  }
});

// Buscar ciudadano por cédula con sus notificaciones
router.get('/buscar/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    const [usuarios] = await db.query(
      'SELECT id, cedula, nombre, email, fecha_nacimiento, sisben_grupo, zona, rol FROM usuarios WHERE cedula = ?',
      [cedula]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Ciudadano no encontrado con esa cédula' });
    }

    const usuario = usuarios[0];
    let notificaciones = [];

    try {
      const [notifs] = await db.query(
        `SELECT n.id, n.mensaje, n.fecha_notificacion, 
                COALESCE(s.nombre, 'Programa Social') AS subsidio 
         FROM notificaciones n 
         LEFT JOIN subsidios s ON n.subsidio_id = s.id 
         WHERE n.usuario_id = ? 
         ORDER BY n.fecha_notificacion DESC`,
        [usuario.id]
      );
      notificaciones = notifs;
    } catch (errNotif) {
      console.warn('Advertencia al consultar notificaciones:', errNotif.message);
    }

    res.json({ usuario, notificaciones });
  } catch (error) {
    console.error('Error al buscar ciudadano:', error);
    res.status(500).json({ error: 'Error interno al consultar información del ciudadano' });
  }
});

module.exports = router;