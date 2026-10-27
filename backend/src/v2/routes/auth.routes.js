const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const {
  enviarCodigoVerificacion,
  enviarCodigoRecuperacion,
  enviarRecordatorioCuentas,
} = require('../utils/mailer');
const { registrarAuditoria } = require('../utils/audit');

const router = express.Router();

// Asegurar columnas de verificación y recuperación en la base de datos
(async function ensureAuthColumns() {
  try {
    await pool.query(`
      ALTER TABLE usuarios_multiempresa
        ADD COLUMN IF NOT EXISTS correo_verificado BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS codigo_verificacion VARCHAR(10),
        ADD COLUMN IF NOT EXISTS codigo_verificacion_expira TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS codigo_recuperacion VARCHAR(10),
        ADD COLUMN IF NOT EXISTS codigo_recuperacion_expira TIMESTAMPTZ;

      -- Marcar los usuarios demo iniciales como ya verificados para compatibilidad
      UPDATE usuarios_multiempresa
      SET correo_verificado = TRUE
      WHERE correo IN ('admin@demo.com', 'supervisor@demo.com', 'tecnico@demo.com')
        AND correo_verificado = FALSE;
    `);
  } catch (err) {
    console.warn('Aviso asegurando columnas de verificación en usuarios_multiempresa:', err.message);
  }
})();

function crearToken(usuario) {
  return jwt.sign(
    {
      user_id: usuario.id,
      service_company_id: usuario.empresa_prestadora_id,
      role: usuario.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function generarCodigo6Digitos() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO_EMPRESA_REGEX = /^[A-Za-z0-9_-]{3,20}$/;
const UNKNOWN_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

// Permite identificar la empresa con su código corto (ej. MAQ01) además del UUID
router.use(async (req, res, next) => {
  const value = req.body && req.body.serviceCompanyId;
  if (typeof value !== 'string' || !value.trim() || UUID_REGEX.test(value.trim())) {
    return next();
  }
  try {
    const { rows } = await pool.query(
      'SELECT id FROM empresas_prestadoras WHERE UPPER(nombre_comercial) = UPPER($1) LIMIT 1',
      [value.trim()]
    );
    req.body.serviceCompanyId = rows[0] ? rows[0].id : UNKNOWN_COMPANY_ID;
    return next();
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /register
 * Registra nueva empresa prestadora y usuario administrador inicial.
 * Requiere verificación por correo antes de permitir acceso.
 */
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { razonSocial, nombre, correo, password, codigoEmpresa, rol = 'admin' } = req.body;
    if (!razonSocial || !nombre || !correo || !password) {
      return res.status(400).json({ error: 'razonSocial, nombre, correo y password son obligatorios' });
    }
    if (!['admin', 'supervisor', 'tecnico'].includes(rol) || password.length < 6) {
      return res.status(400).json({ error: 'Rol o contraseña inválidos (mínimo 6 caracteres)' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const cleanNombre = nombre.trim();
    const cleanRazonSocial = razonSocial.trim();
    const cleanCodigoEmpresa = codigoEmpresa ? String(codigoEmpresa).trim().toUpperCase() : '';

    if (cleanCodigoEmpresa) {
      if (!CODIGO_EMPRESA_REGEX.test(cleanCodigoEmpresa)) {
        return res.status(400).json({
          error: 'El código de empresa debe tener de 3 a 20 caracteres: letras, números, guion o guion bajo.',
        });
      }
      const existing = await client.query(
        'SELECT 1 FROM empresas_prestadoras WHERE UPPER(nombre_comercial) = $1 LIMIT 1',
        [cleanCodigoEmpresa]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Ese código de empresa ya existe. Elige otro.' });
      }
    }

    await client.query('BEGIN');

    const companyResult = await client.query(
      `INSERT INTO empresas_prestadoras (razon_social, nombre_comercial)
       VALUES ($1, $2) RETURNING id, razon_social, nombre_comercial`,
      [cleanRazonSocial, cleanCodigoEmpresa || cleanNombre]
    );
    const company = companyResult.rows[0];

    const passwordHash = await bcrypt.hash(password, 10);
    const codigoVerificacion = generarCodigo6Digitos();

    const userResult = await client.query(
      `INSERT INTO usuarios_multiempresa
       (empresa_prestadora_id, nombre_completo, correo, clave_hash, rol, correo_verificado, codigo_verificacion, codigo_verificacion_expira)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6, NOW() + INTERVAL '24 hours')
       RETURNING id, empresa_prestadora_id, nombre_completo, correo, rol, correo_verificado`,
      [company.id, cleanNombre, cleanEmail, passwordHash, rol, codigoVerificacion]
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    // Envío del código de verificación al correo
    const emailRes = await enviarCodigoVerificacion({
      correo: cleanEmail,
      nombre: cleanNombre,
      codigo: codigoVerificacion,
      nombreEmpresa: company.razon_social,
      serviceCompanyId: cleanCodigoEmpresa || company.id,
    });

    return res.status(201).json({
      ok: true,
      requiereVerificacion: true,
      message: emailRes.sent
        ? 'Registro exitoso. Se envió el código de verificación a tu correo.'
        : `Cuenta creada. ${emailRes.message}`,
      emailSent: emailRes.sent,
      usuario: user,
      empresa: company,
      companyCode: cleanCodigoEmpresa || undefined,
      devCode: emailRes.devMode ? emailRes.devCode : undefined,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en v2 register:', error);
    return res.status(500).json({ error: 'No se pudo registrar la empresa' });
  } finally {
    client.release();
  }
});

/**
 * POST /login
 * Inicia sesión verificando credenciales y estado de confirmación de correo.
 */
router.post('/login', async (req, res) => {
  try {
    const { serviceCompanyId, correo, password } = req.body;
    if (!serviceCompanyId || !correo || !password) {
      return res.status(400).json({ error: 'serviceCompanyId, correo y password son obligatorios' });
    }

    const cleanCompanyId = String(serviceCompanyId).trim();
    const cleanEmail = correo.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, empresa_prestadora_id, nombre_completo, correo, clave_hash, rol, activo,
              correo_verificado, codigo_verificacion, codigo_verificacion_expira
       FROM usuarios_multiempresa
       WHERE empresa_prestadora_id = $1 AND LOWER(correo) = $2
       LIMIT 1`,
      [cleanCompanyId, cleanEmail]
    );
    const user = result.rows[0];

    if (!user || !user.activo || !(await bcrypt.compare(password, user.clave_hash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si el usuario aún no ha verificado su correo, bloquear acceso hasta que confirme
    if (!user.correo_verificado) {
      // Si el código actual está vacío o expirado, generar uno nuevo
      let codigo = user.codigo_verificacion;
      const expira = user.codigo_verificacion_expira ? new Date(user.codigo_verificacion_expira) : null;
      if (!codigo || !expira || expira < new Date()) {
        codigo = generarCodigo6Digitos();
        await pool.query(
          `UPDATE usuarios_multiempresa
           SET codigo_verificacion = $1, codigo_verificacion_expira = NOW() + INTERVAL '24 hours'
           WHERE id = $2`,
          [codigo, user.id]
        );
      }

      const emailRes = await enviarCodigoVerificacion({
        correo: user.correo,
        nombre: user.nombre_completo,
        codigo,
      });

      return res.status(403).json({
        error: emailRes.sent
          ? 'Tu correo aún no está verificado. Revisa tu bandeja de entrada e ingresa el código.'
          : `Tu correo aún no está verificado. ${emailRes.message}`,
        requiereVerificacion: true,
        correo: user.correo,
        serviceCompanyId: user.empresa_prestadora_id,
        emailSent: emailRes.sent,
        devCode: emailRes.devMode ? emailRes.devCode : undefined,
      });
    }

    return res.json({
      ok: true,
      token: crearToken(user),
      usuario: {
        id: user.id,
        empresa_prestadora_id: user.empresa_prestadora_id,
        nombre_completo: user.nombre_completo,
        correo: user.correo,
        rol: user.rol,
        correo_verificado: user.correo_verificado,
      },
    });
  } catch (error) {
    console.error('Error en v2 login:', error);
    return res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

/**
 * POST /verify-email
 * Valida el código de 6 dígitos y activa la cuenta del usuario.
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { serviceCompanyId, correo, codigo } = req.body;
    if (!correo || !codigo) {
      return res.status(400).json({ error: 'correo y código de verificación son obligatorios' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const cleanCodigo = codigo.trim();

    const companyFilter = serviceCompanyId ? 'AND empresa_prestadora_id = $2' : '';
    const params = serviceCompanyId ? [cleanEmail, serviceCompanyId] : [cleanEmail];

    const result = await pool.query(
      `SELECT id, empresa_prestadora_id, nombre_completo, correo, rol, activo,
              codigo_verificacion, codigo_verificacion_expira
       FROM usuarios_multiempresa
       WHERE LOWER(correo) = $1 ${companyFilter}
       LIMIT 1`,
      params
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.codigo_verificacion || user.codigo_verificacion !== cleanCodigo) {
      return res.status(400).json({ error: 'El código de verificación es incorrecto' });
    }

    if (user.codigo_verificacion_expira && new Date(user.codigo_verificacion_expira) < new Date()) {
      return res.status(400).json({ error: 'El código de verificación ha expirado. Solicita un nuevo reenvío.' });
    }

    await pool.query(
      `UPDATE usuarios_multiempresa
       SET correo_verificado = TRUE,
           codigo_verificacion = NULL,
           codigo_verificacion_expira = NULL,
           actualizado_en = NOW()
       WHERE id = $1`,
      [user.id]
    );

    const updatedUser = {
      ...user,
      correo_verificado: true,
    };

    return res.json({
      ok: true,
      message: '¡Correo verificado con éxito! Tu cuenta ha sido activada.',
      token: crearToken(updatedUser),
      usuario: {
        id: updatedUser.id,
        empresa_prestadora_id: updatedUser.empresa_prestadora_id,
        nombre_completo: updatedUser.nombre_completo,
        correo: updatedUser.correo,
        rol: updatedUser.rol,
        correo_verificado: true,
      },
    });
  } catch (error) {
    console.error('Error en verify-email:', error);
    return res.status(500).json({ error: 'Error al verificar el correo electrónico' });
  }
});

/**
 * POST /resend-verification
 * Reenvía un nuevo código de verificación de 6 dígitos al correo.
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { serviceCompanyId, correo } = req.body;
    if (!correo) {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const companyFilter = serviceCompanyId ? 'AND empresa_prestadora_id = $2' : '';
    const params = serviceCompanyId ? [cleanEmail, serviceCompanyId] : [cleanEmail];

    const result = await pool.query(
      `SELECT u.id, u.empresa_prestadora_id, u.nombre_completo, u.correo, u.correo_verificado,
              e.razon_social AS nombre_empresa
       FROM usuarios_multiempresa u
       JOIN empresas_prestadoras e ON e.id = u.empresa_prestadora_id
       WHERE LOWER(u.correo) = $1 ${companyFilter}
       LIMIT 1`,
      params
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    if (user.correo_verificado) {
      return res.status(400).json({ error: 'Esta cuenta ya se encuentra verificada. Puedes iniciar sesión directamente.' });
    }

    const nuevoCodigo = generarCodigo6Digitos();
    await pool.query(
      `UPDATE usuarios_multiempresa
       SET codigo_verificacion = $1, codigo_verificacion_expira = NOW() + INTERVAL '24 hours'
       WHERE id = $2`,
      [nuevoCodigo, user.id]
    );

    const emailRes = await enviarCodigoVerificacion({
      correo: user.correo,
      nombre: user.nombre_completo,
      codigo: nuevoCodigo,
      nombreEmpresa: user.nombre_empresa,
      serviceCompanyId: user.empresa_prestadora_id,
    });

    return res.json({
      ok: true,
      message: emailRes.sent ? 'Nuevo código enviado a tu correo.' : emailRes.message,
      emailSent: emailRes.sent,
      devCode: emailRes.devMode ? emailRes.devCode : undefined,
    });
  } catch (error) {
    console.error('Error en resend-verification:', error);
    return res.status(500).json({ error: 'No se pudo reenviar el código de verificación' });
  }
});

/**
 * POST /forgot-password
 * Genera código de 6 dígitos para recuperación de contraseña y envía recordatorio de empresa.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { correo, serviceCompanyId } = req.body;
    if (!correo || !correo.trim()) {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const companyFilter = serviceCompanyId ? 'AND u.empresa_prestadora_id = $2' : '';
    const params = serviceCompanyId ? [cleanEmail, serviceCompanyId] : [cleanEmail];

    const result = await pool.query(
      `SELECT u.id, u.empresa_prestadora_id, u.nombre_completo, u.correo,
              e.razon_social AS nombre_empresa
       FROM usuarios_multiempresa u
       JOIN empresas_prestadoras e ON e.id = u.empresa_prestadora_id
       WHERE LOWER(u.correo) = $1 ${companyFilter}
       LIMIT 1`,
      params
    );

    const user = result.rows[0];
    // Por seguridad, si el correo no existe, respondemos con éxito genérico para no filtrar cuentas
    if (!user) {
      return res.json({
        ok: true,
        message: 'Si el correo está registrado en la plataforma, recibirás las instrucciones con tu código de recuperación.',
      });
    }

    const codigoRecuperacion = generarCodigo6Digitos();
    await pool.query(
      `UPDATE usuarios_multiempresa
       SET codigo_recuperacion = $1,
           codigo_recuperacion_expira = NOW() + INTERVAL '15 minutes'
       WHERE id = $2`,
      [codigoRecuperacion, user.id]
    );

    const emailRes = await enviarCodigoRecuperacion({
      correo: user.correo,
      nombre: user.nombre_completo,
      codigo: codigoRecuperacion,
      nombreEmpresa: user.nombre_empresa,
      serviceCompanyId: user.empresa_prestadora_id,
    });

    await registrarAuditoria({
      empresaPrestadoraId: user.empresa_prestadora_id,
      usuarioId: user.id,
      accion: 'modificar',
      entidad: 'usuario',
      entidadId: user.id,
      detalle: { accion: 'solicitud_recuperacion_clave' },
    });

    return res.json({
      ok: true,
      message: 'Código de recuperación enviado. Revisa tu bandeja de entrada o spam.',
      serviceCompanyId: user.empresa_prestadora_id,
      devCode: emailRes.devCode || (process.env.NODE_ENV !== 'production' ? codigoRecuperacion : undefined),
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return res.status(500).json({ error: 'No se pudo procesar la solicitud de recuperación' });
  }
});

/**
 * POST /reset-password
 * Valida el código de recuperación e implementa la nueva contraseña.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { correo, codigo, nuevaPassword, serviceCompanyId } = req.body;
    if (!correo || !codigo || !nuevaPassword) {
      return res.status(400).json({ error: 'correo, código y nuevaPassword son obligatorios' });
    }
    if (nuevaPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const cleanEmail = correo.trim().toLowerCase();
    const cleanCodigo = codigo.trim();
    const companyFilter = serviceCompanyId ? 'AND empresa_prestadora_id = $2' : '';
    const params = serviceCompanyId ? [cleanEmail, serviceCompanyId] : [cleanEmail];

    const result = await pool.query(
      `SELECT id, empresa_prestadora_id, nombre_completo, correo,
              codigo_recuperacion, codigo_recuperacion_expira
       FROM usuarios_multiempresa
       WHERE LOWER(correo) = $1 ${companyFilter}
       LIMIT 1`,
      params
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.codigo_recuperacion || user.codigo_recuperacion !== cleanCodigo) {
      return res.status(400).json({ error: 'El código de recuperación ingresado es inválido' });
    }

    if (user.codigo_recuperacion_expira && new Date(user.codigo_recuperacion_expira) < new Date()) {
      return res.status(400).json({ error: 'El código de recuperación ha expirado (límite 15 minutos). Solicita uno nuevo.' });
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);

    await pool.query(
      `UPDATE usuarios_multiempresa
       SET clave_hash = $1,
           codigo_recuperacion = NULL,
           codigo_recuperacion_expira = NULL,
           correo_verificado = TRUE,
           intentos_fallidos = 0,
           bloqueado_hasta = NULL,
           actualizado_en = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    await registrarAuditoria({
      empresaPrestadoraId: user.empresa_prestadora_id,
      usuarioId: user.id,
      accion: 'modificar',
      entidad: 'usuario',
      entidadId: user.id,
      detalle: { accion: 'restablecimiento_clave_exitoso' },
    });

    return res.json({
      ok: true,
      message: '¡Tu contraseña ha sido restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error) {
    console.error('Error en reset-password:', error);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
});

/**
 * POST /recover-user
 * Envía por correo un recordatorio con los IDs de empresa y cuentas asociadas a un correo.
 */
router.post('/recover-user', async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo || !correo.trim()) {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    const cleanEmail = correo.trim().toLowerCase();

    const result = await pool.query(
      `SELECT u.id, u.empresa_prestadora_id, u.nombre_completo, u.correo, u.rol,
              e.razon_social AS nombre_empresa
       FROM usuarios_multiempresa u
       JOIN empresas_prestadoras e ON e.id = u.empresa_prestadora_id
       WHERE LOWER(u.correo) = $1 AND u.activo = TRUE`,
      [cleanEmail]
    );

    if (result.rows.length > 0) {
      await enviarRecordatorioCuentas({
        correo: cleanEmail,
        cuentas: result.rows,
      });
    }

    return res.json({
      ok: true,
      message: 'Si el correo está registrado, recibirás un recordatorio con tus empresas y datos de acceso.',
    });
  } catch (error) {
    console.error('Error en recover-user:', error);
    return res.status(500).json({ error: 'Error procesando solicitud de recuperación de usuario' });
  }
});

/**
 * GET /me
 * Consulta los datos del usuario conectado
 */
router.get('/me', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, empresa_prestadora_id, nombre_completo, correo, rol, activo, correo_verificado
     FROM usuarios_multiempresa
     WHERE id = $1 AND empresa_prestadora_id = $2`,
    [req.user.id, req.user.service_company_id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  return res.json({ ok: true, usuario: result.rows[0] });
});

module.exports = router;
