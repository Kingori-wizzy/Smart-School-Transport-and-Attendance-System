const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {

    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Access denied. No role found.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

module.exports = roleMiddleware;
