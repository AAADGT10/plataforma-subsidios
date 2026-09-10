const express = require('express');
const cors = require('cors');
require('dotenv').config();

const subsidiosRoutes = require('./routes/subsidios');
const evaluadorRoutes = require('./routes/evaluador');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/subsidios', subsidiosRoutes);
app.use('/api/evaluar', evaluadorRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});