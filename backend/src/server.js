require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const maquinasRoutes = require('./routes/maquinas.routes');
const piezasRoutes = require('./routes/piezas.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');
const asistenteRoutes = require('./routes/asistente.routes');
const staticAssets = require('./middlewares/staticAssets');
const v2App = require('./v2/app');

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Faltan variables de entorno: DATABASE_URL y JWT_SECRET.');
  console.error('Crea un archivo .env en /backend con esas variables antes de iniciar el servidor.');
  process.exit(1);
}

const app = express();
const canonicalOrigin = 'https://hydrotech-api-c2bs.onrender.com';
const webBuildPath = path.join(__dirname, '../../web-build');

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0].trim();
    const canonicalHost = new URL(canonicalOrigin).host;
    if (forwardedProtocol !== 'https' || req.get('host') !== canonicalHost) {
      return res.redirect(301, `${canonicalOrigin}${req.originalUrl}`);
    }
  }
  return next();
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(webBuildPath, { index: false }));
app.use('/assets', staticAssets);

// Ruta de salud, útil para verificar que el deploy en el hosting funciona
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'API HydroTech corriendo.' });
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /uploads/\nSitemap: ${canonicalOrigin}/sitemap.xml\n`,
  );
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      `  <url><loc>${canonicalOrigin}/</loc></url>\n` +
      '</urlset>\n',
  );
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maquinas', maquinasRoutes);
app.use('/api/piezas', piezasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/asistente', asistenteRoutes);
app.use('/api/v2', v2App);

app.get('/', (req, res) => {
  res.sendFile(path.join(webBuildPath, 'index.html'));
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, message: 'Ruta no encontrada.' });
  }
  return res.status(404).sendFile(path.join(__dirname, '../../404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
