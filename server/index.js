const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const verifyToken = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const logger = require('./utils/logger');
const cors = require('cors')
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(cors({ origin: '*' }));
// Store connected clients with unique IDs
const clients = new Map();
app.locals.clients = clients;
app.locals.getClientSocket = (req) => {
  const clientId = req.headers['x-client-id'];
  logger.debug(`[getClientSocket] Retrieving socket for clientId: ${clientId}`);
  const socket = clientId ? clients.get(clientId) : null;
  logger.debug(`[getClientSocket] Socket found: ${socket ? 'Yes' : 'No'}`);
  return socket;
};

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = req.url.split('clientId=')[1] || Date.now().toString();
  logger.info(`[WebSocket] User connected: ${clientId}`);
  clients.set(clientId, ws);

  ws.on('message', async (message) => {
    logger.debug(`[WebSocket] Received message: ${message}`);
    try {
      const data = JSON.parse(message);
      logger.debug(`[WebSocket] Parsed message data: ${JSON.stringify(data)}`);
      if (data.type === 'weather') {
        const { location, units, token } = data;
        logger.info(`[WebSocket] Processing weather request - Location: ${location}, Units: ${units}, Token: ${token}`);

        // Verify JWT
        try {
          logger.debug(`[WebSocket] Verifying JWT token: ${token}`);
          jwt.verify(token, 'your_jwt_secret');
          logger.debug('[WebSocket] JWT verification successful');
        } catch (err) {
          logger.error(`[WebSocket] JWT verification failed: ${err.message}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ success: false, error: 'Invalid token' }));
            logger.debug('[WebSocket] Sent error response: Invalid token');
          }
          return;
        }

        // Validate inputs
        if (!location) {
          logger.error('[WebSocket] Validation failed: Location is required');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ success: false, error: 'Location is required' }));
            logger.debug('[WebSocket] Sent error response: Location is required');
          }
          return;
        }
        if (!['metric', 'imperial'].includes(units)) {
          logger.error('[WebSocket] Validation failed: Invalid units');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ success: false, error: 'Invalid units. Use metric or imperial' }));
            logger.debug('[WebSocket] Sent error response: Invalid units');
          }
          return;
        }

        // Fetch weather data
        const apiKey = process.env.WEATHER_API_KEY;
        const baseUrl = process.env.WEATHER_API_URL;
        const url = `${baseUrl}?q=${encodeURIComponent(location)},AU&appid=${apiKey}&units=${units}`;
        logger.info(`[WebSocket] Fetching weather data from URL: ${url}`);

        try {
          const response = await fetch(url);
          logger.debug(`[WebSocket] Weather API response status: ${response.status}`);
          const weatherData = await response.json();
          logger.debug(`[WebSocket] Weather API response data: ${JSON.stringify(weatherData)}`);

          const wsResponse = weatherData.cod !== 200
            ? { success: false, error: weatherData.message }
            : {
                success: true,
                data: {
                  city: weatherData.name,
                  temperature: weatherData.main.temp,
                  description: weatherData.weather[0].description,
                  units: units === 'metric' ? '°C' : '°F'
                }
              };

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(wsResponse));
            logger.debug(`[WebSocket] Sent response: ${JSON.stringify(wsResponse)}`);
          } else {
            logger.error('[WebSocket] Client socket closed, unable to send response');
          }
        } catch (error) {
          logger.error(`[WebSocket] Error fetching weather: ${error.message}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ success: false, error: 'Error fetching weather' }));
            logger.debug('[WebSocket] Sent error response: Error fetching weather');
          }
        }
      } else {
        logger.error(`[WebSocket] Invalid message type: ${data.type}`);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ success: false, error: 'Invalid message type' }));
          logger.debug('[WebSocket] Sent error response: Invalid message type');
        }
      }
    } catch (error) {
      logger.error(`[WebSocket] Error parsing message: ${error.message}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ success: false, error: 'Invalid message format' }));
        logger.debug('[WebSocket] Sent error response: Invalid message format');
      }
    }
  });

  ws.on('close', () => {
    logger.info(`[WebSocket] User disconnected: ${clientId}`);
    clients.delete(clientId);
  });
});

// Apply middleware to all routes
app.use(verifyToken);

// Mount routes
app.use(authRoutes);

server.listen(process.env.PORT, () => {
  logger.info(`[Server] Running on http://localhost:${process.env.PORT}`);
});
