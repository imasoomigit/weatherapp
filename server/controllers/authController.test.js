const { login } = require('./authController');
const jwt = require('jsonwebtoken');

// Mock WebSocket clients
const mockClients = new Map();
const mockSend = jest.fn();
mockClients.set('client1', { readyState: 1, send: mockSend }); // WebSocket.OPEN = 1

// Mock request and response
const mockRequest = (body) => ({
  body,
  app: { locals: { clients: mockClients, getClientSocket: () => mockClients.get('client1') } }
});
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock('jsonwebtoken');

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClients.clear();
    mockClients.set('client1', { readyState: 1, send: mockSend });
  });

  test('should return JWT for valid credentials', async () => {
    const req = mockRequest({ username: 'user', password: 'password' });
    const res = mockResponse();
    const mockToken = 'mock-jwt-token';
    jwt.sign.mockReturnValue(mockToken);

    await login(req, res);

    expect(jwt.sign).toHaveBeenCalledWith({ username: 'user' }, 'your_jwt_secret', { expiresIn: '1h' });
    expect(res.json).toHaveBeenCalledWith({ token: mockToken });
    expect(res.status).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('should return 401 for invalid credentials', async () => {
    const req = mockRequest({ username: 'wrong', password: 'password' });
    const res = mockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ success: false, error: 'Invalid credentials' }));
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('should handle missing username or password', async () => {
    const req = mockRequest({ username: '', password: 'password' });
    const res = mockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ success: false, error: 'Invalid credentials' }));
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  test('should not send WebSocket message if client socket is closed', async () => {
    const req = mockRequest({ username: 'wrong', password: 'password' });
    const res = mockResponse();
    mockClients.set('client1', { readyState: 3, send: mockSend }); // WebSocket.CLOSED = 3

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
