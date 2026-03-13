const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach user data (id, role) to request
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
}

// Generic Role checking middleware
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
}

// ✅ Define the specific helpers your routes expect
const isAdmin = authorizeRoles('admin');
const isParent = authorizeRoles('parent');
const isDriver = authorizeRoles('driver');
const isAdminOrDriver = authorizeRoles('admin', 'driver');

module.exports = { 
  authMiddleware, 
  authorizeRoles, 
  isAdmin, 
  isParent, 
  isDriver, 
  isAdminOrDriver 
};