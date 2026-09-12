const express = require('express');
const cors = require('cors');

require('dotenv').config();

const subsidiosRoutes = require('./routes/subsidios');
const evaluadorRoutes = require('./routes/evaluador');
const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdf'); // <--- ¡Faltaba importar esta ruta!

const app = express();
app.use(cors());
app.use(express.json());

// Rutas API
app.use('/api/subsidios', subsidiosRoutes);
app.use('/api/evaluador', evaluadorRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});