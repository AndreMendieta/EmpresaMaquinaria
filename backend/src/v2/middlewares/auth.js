const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({error: 'Token no proporcionado'});
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.user_id,
      service_company_id: payload.service_company_id,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({error: 'Token inválido o expirado'});
  }
}

module.exports = auth;
