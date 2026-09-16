const express = require('express');
const pool = require('../db/pool');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

router.use(verifyToken);

function buildSearchTerms(question) {
  return question
    .toLowerCase()
    .replace(/[^a-záéíóúüñ0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 3)
    .slice(0, 8);
}

async function buscarContexto(empresaId, question) {
  const terms = buildSearchTerms(question);
  if (terms.length === 0) {
    return { maquinas: [], piezas: [] };
  }

  const searchPatterns = terms.map((term) => `%${term}%`);
  const [maquinasResult, piezasResult] = await Promise.all([
    pool.query(
      `SELECT id, codigo, nombre, tipo, manual_url, descripcion
       FROM maquinarias
       WHERE empresa_id = $1 AND estado = 'activa'
            AND (nombre ILIKE ANY($2::text[]) OR codigo ILIKE ANY($2::text[])
              OR tipo ILIKE ANY($2::text[]) OR descripcion ILIKE ANY($2::text[]))
       ORDER BY creado_en DESC LIMIT 10`,
      [empresaId, searchPatterns]
    ),
    pool.query(
      `SELECT p.id, p.codigo, p.nombre, p.tipo, p.medidas, p.descripcion,
              m.codigo AS maquina_codigo, m.nombre AS maquina_nombre
       FROM piezas p
       JOIN maquinarias m ON m.id = p.maquina_id
       WHERE p.empresa_id = $1 AND m.estado = 'activa'
            AND (p.nombre ILIKE ANY($2::text[]) OR p.codigo ILIKE ANY($2::text[])
              OR p.tipo ILIKE ANY($2::text[]) OR p.descripcion ILIKE ANY($2::text[]))
       ORDER BY p.creado_en DESC LIMIT 10`,
      [empresaId, searchPatterns]
    ),
  ]);

  return {
    maquinas: maquinasResult.rows,
    piezas: piezasResult.rows,
  };
}

/**
 * POST /api/asistente
 * Body: { pregunta }
 * Responde solo con información encontrada en la empresa del usuario.
 */
router.post('/', async (req, res) => {
  try {
    const pregunta = typeof req.body.pregunta === 'string' ? req.body.pregunta.trim() : '';
    if (pregunta.length < 3 || pregunta.length > 1000) {
      return res.status(400).json({
        ok: false,
        message: 'La pregunta debe tener entre 3 y 1000 caracteres.',
      });
    }

    const contexto = await buscarContexto(req.user.empresaId, pregunta);
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        ok: false,
        message: 'El asistente no está configurado. Define OPENAI_API_KEY en el entorno del backend.',
        contexto,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: 'Eres un asistente técnico de HydroTech. Responde únicamente con base en el contexto entregado. Si el contexto no contiene la respuesta, dilo claramente. No diagnostiques fallas, no inventes datos y no reemplaces el criterio de un técnico.',
            },
            {
              role: 'user',
              content: JSON.stringify({ pregunta, contexto }),
            },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Error del proveedor de IA:', response.status, data.error?.message || 'sin detalle');
      return res.status(502).json({ ok: false, message: 'El proveedor del asistente no respondió correctamente.' });
    }

    const respuesta = data.choices?.[0]?.message?.content?.trim();
    if (!respuesta) {
      return res.status(502).json({ ok: false, message: 'El proveedor del asistente devolvió una respuesta vacía.' });
    }

    return res.json({ ok: true, respuesta, contexto });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ ok: false, message: 'El asistente tardó demasiado en responder.' });
    }
    console.error('Error en POST /api/asistente:', error);
    return res.status(500).json({ ok: false, message: 'Error interno del asistente.' });
  }
});

module.exports = router;
