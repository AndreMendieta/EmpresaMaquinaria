require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de salud, útil para verificar que el deploy en el hosting funciona
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'API EmpresaMaquinaria corriendo.' });
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
