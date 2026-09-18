const jwt = require('jsonwebtoken');
const db = require('../config/db');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await db.query(
      `SELECT u.*, r.name as role_name, r.display_name as role_display_name,
              c.name as company_name, un.name as unit_name, d.name as division_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN companies c ON u.company_id = c.id
       LEFT JOIN units un ON u.unit_id = un.id
       LEFT JOIN divisions d ON u.division_id = d.id
       WHERE u.id = ? AND u.is_active = 1`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
    }

    // Get permissions
    const [permissions] = await db.query(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [users[0].role_id]
    );

    req.user = users[0];
    req.user.permissions = permissions.map(p => p.name);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
};

const checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (req.user.role_name === 'super_admin') return next();
    
    const hasPermission = requiredPermissions.some(p => req.user.permissions.includes(p));
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    next();
  };
};

module.exports = { auth, checkPermission };
