const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const WebSocket = require('ws');

// In-memory user
const users = [{ username: 'user', password: 'password' }];
const jwtSecret = 'your_jwt_secret'; // Change in production

exports.login = (req, res) => {
  const { username, password } = req.body;
  logger.info(`[AuthController] Login request received - Username: ${username}, Password: ${password}`);
  const clientSocket = req.app.locals.getClientSocket(req);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    const errorMsg = 'Invalid credentials';
    logger.error(`[AuthController] Login failed: ${errorMsg}`);
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(JSON.stringify({ success: false, error: errorMsg }));
      logger.debug(`[AuthController] Sent WebSocket error: ${errorMsg}`);
    }
    return res.status(401).json({ error: errorMsg });
  }

  const token = jwt.sign({ username }, jwtSecret, { expiresIn: '1h' });
  logger.info(`[AuthController] Login successful, generated token: ${token}`);
  res.json({ token });
};
