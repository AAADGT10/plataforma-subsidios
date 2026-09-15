const express = require('express');
const router = express.Router();
const pool = require('../db');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// POST /api/subsidios - Crear un subsidio con sus criterios dinámicos
router.post('/', async (req, res) => {
  const { nombre, descripcion, cupos, criterios } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [subsidioResult] = await connection.query(
      'INSERT INTO subsidios (nombre, descripcion, cupos) VALUES (?, ?, ?)',
      [nombre, descripcion, cupos]
    );
    const subsidioId = subsidioResult.insertId;

    if (criterios && criterios.length > 0) {
      const criteriosValues = criterios.map(c => [
        subsidioId,
        c.campo_evaluar || c.campo || c.campoEvaluar,
        c.operador,
        c.valor_referencia || c.valor
      ]);

      await connection.query(
        'INSERT INTO criterios_subsidio (subsidio_id, campo_evaluar, operador, valor_referencia) VALUES ?',
        [criteriosValues]
      );
    }

    await connection.commit();
    res.status(201).json({ mensaje: 'Subsidio y criterios creados con éxito', subsidioId });

  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Error al crear el subsidio', detalle: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/subsidios - Obtener todos los subsidios con sus criterios y soporte opcional de filtro por estado
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query;
    let query = 'SELECT * FROM subsidios';
    let queryParams = [];

    if (estado) {
      query += ' WHERE estado = ?';
      queryParams.push(estado);
    }

    const [subsidios] = await pool.query(query, queryParams);
    const [criterios] = await pool.query('SELECT * FROM criterios_subsidio');

    const resultado = subsidios.map(s => ({
      ...s,
      criterios: criterios.filter(c => c.subsidio_id === s.id)
    }));

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener subsidios', detalle: error.message });
  }
});

// PATCH /api/subsidios/:id/estado - Cambiar estado del subsidio (activo / archivado)
router.patch('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!['activo', 'archivado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE subsidios SET estado = ? WHERE id = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subsidio no encontrado' });
    }

    res.json({ mensaje: `Subsidio ${estado} con éxito` });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el estado', detalle: error.message });
  }
});

// GET /api/subsidios/:id/pdf-beneficiarios - Generar PDF oficial elegante con el listado de beneficiarios
router.get('/:id/pdf-beneficiarios', async (req, res) => {
  const { id } = req.params;

  try {
    const [subsidios] = await pool.query('SELECT * FROM subsidios WHERE id = ?', [id]);
    if (subsidios.length === 0) {
      return res.status(404).json({ error: 'Subsidio no encontrado' });
    }
    const subsidio = subsidios[0];

    const [beneficiarios] = await pool.query(
      `SELECT DISTINCT u.cedula, u.nombre, u.email, u.sisben_grupo, u.zona 
       FROM notificaciones n 
       JOIN usuarios u ON n.usuario_id = u.id 
       WHERE n.subsidio_id = ?`,
      [id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=beneficiarios_${id}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    doc.pipe(res);

    const logoPath = path.join(__dirname, '../../bk-assets/logo-valencia.jpg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { width: 50 });
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('REPÚBLICA DE COLOMBIA', 115, 45);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('DEPARTAMENTO DE CÓRDOBA', 115, 58);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0284c7').text('ALCALDÍA MUNICIPAL DE VALENCIA', 115, 71);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Sistema de Focalización y Gestión de Programas Sociales', 115, 85);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 105).lineTo(562, 105).stroke();

    doc.moveDown(2.5);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('LISTADO OFICIAL DE BENEFICIARIOS', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0284c7').text(`Programa: ${subsidio.nombre}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Descripción: ${subsidio.descripcion || 'Sin descripción'}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')} | Total Registros: ${beneficiarios.length}`, { align: 'center' });
    doc.moveDown(1.5);

    if (beneficiarios.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#64748b').text('No se encuentran ciudadanos registrados como beneficiarios para este programa actualmente.', { align: 'center' });
    } else {
      let tableTop = doc.y;
      doc.rect(50, tableTop, 512, 22).fillAndStroke('#0f172a', '#0f172a');
      
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      doc.text('N°', 60, tableTop + 7, { width: 35 });
      doc.text('CÉDULA', 100, tableTop + 7, { width: 120 });
      doc.text('NOMBRE COMPLETO', 225, tableTop + 7, { width: 180 });
      doc.text('ZONA', 415, tableTop + 7, { width: 145 });

      let currentY = tableTop + 22;
      doc.font('Helvetica').fontSize(8).fillColor('#334155');

      beneficiarios.forEach((b, index) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        if (index % 2 === 0) {
          doc.rect(50, currentY, 512, 20).fill('#f8fafc');
        }

        doc.fillColor('#1e293b');
        doc.text(index + 1, 60, currentY + 6, { width: 35 });
        doc.text(b.cedula || 'N/A', 100, currentY + 6, { width: 120 });
        doc.text(b.nombre || 'Sin Nombre', 225, currentY + 6, { width: 180, ellipsis: true });
        doc.text(b.zona || 'N/A', 415, currentY + 6, { width: 145 });

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, currentY + 20).lineTo(562, currentY + 20).stroke();
        currentY += 20;
      });
    }

    const pages = doc.bufferedPageCount;
    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i);
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, 735).lineTo(562, 735).stroke();
      doc.fontSize(8).fillColor('#94a3b8').text('Alcaldía Municipal de Valencia - Córdoba | Listado Oficial Consolidado de Beneficiarios', 50, 742, { align: 'center', width: 512 });
      
      doc.page.margins.bottom = bottomMargin;
    }

    doc.end();

  } catch (error) {
    console.error('Error al generar el PDF de beneficiarios:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar el PDF de beneficiarios', detalle: error.message });
    }
  }
});

module.exports = router;