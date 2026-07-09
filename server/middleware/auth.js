const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "sealogistics-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

function getJwtExpiresIn() {
  if (JWT_EXPIRES_IN) {
    return JWT_EXPIRES_IN;
  }

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return Math.max(60, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: getJwtExpiresIn() });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Token não fornecido" });
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Token inválido ou expirado" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  authMiddleware,
  requireRole,
  JWT_SECRET,
};
