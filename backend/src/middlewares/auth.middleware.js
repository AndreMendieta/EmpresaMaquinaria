const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware para verificar la validez del token JWT enviado en el header Authorization.
 * Inyecta los datos del usuario decodificados en `req.user`.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      ok: false,
      message: 'Acceso no autorizado: Token no proporcionado.',
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: payload.userId,
      empresaId: payload.empresaId,
      rol: payload.rol,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Token inválido o expirado.',
    });
  }
}

/**
 * Middleware para restringir el acceso según el rol del usuario.
 * @param  {...string} rolesPermitidos Lista de roles permitidos ('admin', 'supervisor', 'tecnico')
 */
function requireRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        message: `Acceso denegado: Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}.`,
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRoles,
};
