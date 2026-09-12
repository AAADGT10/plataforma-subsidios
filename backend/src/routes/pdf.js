const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const db = require('../db');

router.get('/descargar/:cedula', async (req, res) => {
  const { cedula } = req.params;

  try {
    // 1. Consultar datos del ciudadano
    const [usuarios] = await db.query(
      'SELECT id, cedula, nombre, email, sisben_grupo, zona FROM usuarios WHERE cedula = ?',
      [cedula]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Ciudadano no encontrado' });
    }

    const usuario = usuarios[0];

    // 2. Consultar subsidios/notificaciones asignadas
    const [subsidios] = await db.query(
      `SELECT n.mensaje, n.fecha_notificacion, 
              COALESCE(s.nombre, 'Programa Social') AS subsidio 
       FROM notificaciones n 
       LEFT JOIN subsidios s ON n.subsidio_id = s.id 
       WHERE n.usuario_id = ?`,
      [usuario.id]
    );

    // 3. Configurar respuesta como documento PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado_subsidios_${cedula}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    doc.pipe(res);

    // ==========================================
    // ENCABEZADO INSTITUCIONAL CON LOGO CORREGIDO
    // ==========================================
    // Apunta correctamente a backend/bk-assets/logo-valencia.jpg
    const logoPath = path.join(__dirname, '../../bk-assets/logo-valencia.jpg');
    
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { width: 50 });
    }

    // Membrete al lado del logo
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('REPÚBLICA DE COLOMBIA', 115, 45);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('DEPARTAMENTO DE CÓRDOBA', 115, 58);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0284c7').text('ALCALDÍA MUNICIPAL DE VALENCIA', 115, 71);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Sistema de Focalización y Gestión de Programas Sociales', 115, 85);

    // Línea divisoria elegante
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 105).lineTo(562, 105).stroke();

    // ==========================================
    // TÍTULO DEL CERTIFICADO
    // ==========================================
    doc.moveDown(2.5);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('CERTIFICADO DE ESTADO Y BENEFICIARIOS SOCIOECONÓMICOS', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
    doc.moveDown(1.5);

    // ==========================================
    // INFORMACIÓN DEL CIUDADANO (Tarjeta limpia)
    // ==========================================
    const startY = doc.y;
    doc.rect(50, startY, 512, 105).fillAndStroke('#f8fafc', '#e2e8f0');
    
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('DATOS DEL CIUDADANO', 65, startY + 12);
    
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    doc.text(`Cédula de Ciudadanía:`, 65, startY + 32, { continued: true }).font('Helvetica-Bold').text(` ${usuario.cedula}`);
    doc.font('Helvetica').text(`Nombre Completo:`, 65, startY + 48, { continued: true }).font('Helvetica-Bold').text(` ${usuario.nombre}`);
    doc.font('Helvetica').text(`Correo Electrónico:`, 65, startY + 64, { continued: true }).font('Helvetica-Bold').text(` ${usuario.email}`);
    doc.font('Helvetica').text(`Grupo Sisbén:`, 330, startY + 32, { continued: true }).font('Helvetica-Bold').text(` ${usuario.sisben_grupo || 'No asignado'}`);
    doc.font('Helvetica').text(`Zona de Residencia:`, 330, startY + 48, { continued: true }).font('Helvetica-Bold').text(` ${usuario.zona || 'No especificada'}`);

    doc.y = startY + 120;
    doc.moveDown();

    // ==========================================
    // SUBSIDIOS ASIGNADOS
    // ==========================================
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Programas y Subsidios Asignados:');
    doc.moveDown(0.5);

    if (subsidios.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('El ciudadano actualmente no registra subsidios activos asignados por el motor proactivo.');
    } else {
      subsidios.forEach((sub, index) => {
        const blockY = doc.y;
        doc.rect(50, blockY, 512, 45).fillAndStroke('#ffffff', '#cbd5e1');
        
        doc.fillColor('#0284c7').font('Helvetica-Bold').fontSize(9).text(`${index + 1}. Programa: ${sub.subsidio}`, 60, blockY + 8);
        doc.fillColor('#334155').font('Helvetica').fontSize(8).text(`Detalle: ${sub.mensaje}`, 60, blockY + 22, { width: 350 });
        doc.text(`Fecha: ${sub.fecha_notificacion}`, 420, blockY + 22, { align: 'right', width: 130 });

        doc.y = blockY + 52;
      });
    }

    // ==========================================
    // PIE DE PÁGINA
    // ==========================================
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, 735).lineTo(562, 735).stroke();
    doc.fontSize(8).fillColor('#94a3b8').text('Alcaldía Municipal de Valencia - Córdoba | Documento Oficial Generado Automáticamente', 50, 742, { align: 'center', width: 512 });
    doc.page.margins.bottom = bottom;

    doc.end();
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    res.status(500).json({ error: 'Error interno al generar el documento PDF' });
  }
});

module.exports = reg = router;