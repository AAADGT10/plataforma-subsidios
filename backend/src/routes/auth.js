const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro_plataforma';

// POST /api/auth/registro - Registro de nuevos ciudadanos
router.post('/registro', async (req, res) => {
  const { cedula, nombre, email, password, fecha_nacimiento, sisben_grupo, zona } = req.body;

  try {
    const [existente] = await pool.query(
      'SELECT id FROM usuarios WHERE cedula = ? OR email = ?',
      [cedula, email]
    );

    if (existente.length > 0) {
      return res.status(400).json({ error: 'La cédula o el correo ya se encuentran registrados' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (cedula, nombre, email, password, fecha_nacimiento, sisben_grupo, zona, rol) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ciudadano')`,
      [cedula, nombre, email, passwordHash, fecha_nacimiento, sisben_grupo, zona]
    );

    res.status(201).json({
      mensaje: 'Usuario registrado con éxito',
      usuarioId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario', detalle: error.message });
  }
});

// POST /api/auth/login - Inicio de sesión híbrido (texto plano y bcrypt)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];
    let esValido = false;

    // Si la contraseña en BD está encriptada con bcrypt
    if (usuario.password.startsWith('$2a$') || usuario.password.startsWith('$2b$')) {
      esValido = await bcrypt.compare(password, usuario.password);
    } else {
      // Si está en texto plano (casos antiguos o creados por SQL directo)
      esValido = (password === usuario.password);

      // Auto-migración: Si la clave en texto plano coincide, la encriptamos de una vez en BD
      if (esValido) {
        const nuevoHash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [nuevoHash, usuario.id]);
      }
    }

    if (!esValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor al iniciar sesión', detalle: error.message });
  }
});

module.exports = router;