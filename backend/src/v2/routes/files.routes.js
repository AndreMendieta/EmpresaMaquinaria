const path = require('path');
const express = require('express');
const multer = require('multer');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const {registrarAuditoria} = require('../utils/audit');

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const INLINE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);
const EXTENSION_MIMES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.pdf': 'application/pdf',
  '.dwg': 'application/octet-stream',
  '.dxf': 'application/octet-stream',
  '.doc': 'application/octet-stream',
  '.docx': 'application/octet-stream',
  '.xls': 'application/octet-stream',
  '.xlsx': 'application/octet-stream',
  '.txt': 'text/plain',
};

const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: MAX_FILE_BYTES, files: 1}});

const router = express.Router();

// La descarga es pública pero el identificador es un UUID aleatorio imposible de adivinar,
// así la app puede mostrar imágenes y abrir PDFs sin enviar cabeceras de sesión.
router.get('/:id', async (req, res) => {
  try {
    const {rows} = await pool.query(
      'SELECT nombre, tipo_mime, contenido FROM archivos_multiempresa WHERE id::text = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({error: 'Archivo no encontrado'});
    const file = rows[0];
    const inline = INLINE_MIMES.has(file.tipo_mime);
    res.setHeader('Content-Type', file.tipo_mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.nombre)}"`
    );
    return res.send(file.contenido);
  } catch (error) {
    console.error('Error descargando archivo:', error);
    return res.status(500).json({error: 'No se pudo obtener el archivo'});
  }
});

router.post('/', auth, (req, res) => {
  upload.single('archivo')(req, res, async (uploadError) => {
    if (uploadError) {
      const tooBig = uploadError.code === 'LIMIT_FILE_SIZE';
      return res.status(tooBig ? 413 : 400).json({
        error: tooBig ? 'El archivo supera el máximo de 15 MB' : 'No se pudo leer el archivo',
      });
    }
    if (!req.file) return res.status(400).json({error: 'Adjunta un archivo en el campo "archivo"'});

    const originalName = path.basename(req.file.originalname || 'archivo').slice(0, 200);
    const extension = path.extname(originalName).toLowerCase();
    const mime = EXTENSION_MIMES[extension];
    if (!mime) {
      return res.status(415).json({
        error: 'Tipo de archivo no permitido. Usa imagen, PDF, DWG, DXF, Word, Excel o texto.',
      });
    }

    try {
      const {rows} = await pool.query(
        `INSERT INTO archivos_multiempresa
         (empresa_prestadora_id, nombre, tipo_mime, tamano, contenido, subido_por)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, nombre, tipo_mime, tamano`,
        [req.user.service_company_id, originalName, mime, req.file.size, req.file.buffer, req.user.id]
      );
      await registrarAuditoria({
        empresaPrestadoraId: req.user.service_company_id,
        usuarioId: req.user.id,
        accion: 'crear',
        entidad: 'archivo',
        entidadId: rows[0].id,
        detalle: {nombre: originalName, tamano: req.file.size},
      });
      return res.status(201).json({
        ok: true,
        archivo: {
          id: rows[0].id,
          nombre: rows[0].nombre,
          tipo: rows[0].tipo_mime,
          tamano: rows[0].tamano,
          url: `/api/v2/files/${rows[0].id}`,
        },
      });
    } catch (error) {
      console.error('Error guardando archivo:', error);
      return res.status(500).json({error: 'No se pudo guardar el archivo'});
    }
  });
});

module.exports = router;
