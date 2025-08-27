const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const WebSocket = require('ws');

const jwtSecret = 'your_jwt_secret'; // Change in production

module.exports = function verifyToken(req, res, next) {
  logger.debug(`[Middleware] Processing request for path: ${req.path}`);
  if (req.path === '/login') {
    logger.debug('[Middleware] Skipping token check for /login');
    return next();
  }

  const authHeader = req.headers.authorization;
  logger.debug(`[Middleware] Authorization header: ${authHeader}`);
  const clientSocket = req.app.locals.getClientSocket(req);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const errorMsg = 'No token provided';
    logger.error(`[Middleware] Error: ${errorMsg}`);
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify({ success: false, error: errorMsg }));
      logger.debug(`[Middleware] Sent WebSocket error: ${errorMsg}`);
    }
    return res.status(401).json({ error: errorMsg });
  }

  const token = authHeader.split(' ')[1];
  logger.debug(`[Middleware] Verifying token: ${token}`);
  try {
    const decoded = jwt.verify(token, jwtSecret);
    logger.debug(`[Middleware] Token verification successful: ${JSON.stringify(decoded)}`);
    req.user = decoded;
    next();
  } catch (err) {
    const errorMsg = 'Invalid token';
    logger.error(`[Middleware] Token verification failed: ${err.message}`);
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify({ success: false, error: errorMsg }));
      logger.debug(`[Middleware] Sent WebSocket error: ${errorMsg}`);
    }
    return res.status(401).json({ error: errorMsg });
  }
};
