const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/subsidios - Crear un subsidio con sus criterios dinámicos
router.post('/', async (req, res) => {
  const { nombre, descripcion, cupos, criterios } = req.body;
  
  // Obtenemos una conexión del pool para manejar la transacción
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insertar el subsidio principal
    const [subsidioResult] = await connection.query(
      'INSERT INTO subsidios (nombre, descripcion, cupos) VALUES (?, ?, ?)',
      [nombre, descripcion, cupos]
    );
    const subsidioId = subsidioResult.insertId;

    // 2. Insertar cada criterio dinámico asociado a este subsidio
    if (criterios && criterios.length > 0) {
      const criteriosValues = criterios.map(c => [
        subsidioId,
        c.campo_evaluar,
        c.operador,
        c.valor_referencia
      ]);

      await connection.query(
        'INSERT INTO criterios_subsidio (subsidio_id, campo_evaluar, operador, valor_referencia) VALUES ?',
        [criteriosValues]
      );
    }

    // Si todo sale bien, confirmamos los cambios en la BD
    await connection.commit();
    res.status(201).json({ mensaje: 'Subsidio y criterios creados con éxito', subsidioId });

  } catch (error) {
    // Si algo falla, revertimos cualquier cambio realizado
    await connection.rollback();
    res.status(500).json({ error: 'Error al crear el subsidio', detalle: error.message });
  } finally {
    connection.release(); // Liberar la conexión de vuelta al pool
  }
});

// GET /api/subsidios - Obtener todos los subsidios con sus criterios
router.get('/', async (req, res) => {
  try {
    const [subsidios] = await pool.query('SELECT * FROM subsidios');
    const [criterios] = await pool.query('SELECT * FROM criterios_subsidio');

    // Mapeamos los criterios a sus respectivos subsidios
    const resultado = subsidios.map(s => ({
      ...s,
      criterios: criterios.filter(c => c.subsidio_id === s.id)
    }));

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener subsidios', detalle: error.message });
  }
});

module.exports = router;