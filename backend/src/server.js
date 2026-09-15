require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const maquinasRoutes = require('./routes/maquinas.routes');
const piezasRoutes = require('./routes/piezas.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Faltan variables de entorno: DATABASE_URL y JWT_SECRET.');
  console.error('Crea un archivo .env en /backend con esas variables antes de iniciar el servidor.');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de salud, útil para verificar que el deploy en el hosting funciona
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'API HydroTech corriendo.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maquinas', maquinasRoutes);
app.use('/api/piezas', piezasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Servir visor interactivo HydroTech en la raíz y en /preview
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../preview.html'));
});
app.get('/preview', (req, res) => {
  res.sendFile(path.join(__dirname, '../../preview.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
