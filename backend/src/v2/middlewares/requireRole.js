function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.role)) {
      return res.status(403).json({error: 'No autorizado para esta acción'});
    }
    next();
  };
}

module.exports = requireRole;
