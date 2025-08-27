const verifyToken = require('./auth');
const jwt = require('jsonwebtoken');

// Mock WebSocket clients
const mockClients = new Map();
const mockSend = jest.fn();
mockClients.set('client1', { readyState: 1, send: mockSend }); // WebSocket.OPEN = 1

// Mock request and response
const mockRequest = (headers, path) => ({
  headers,
  path,
  app: { locals: { clients: mockClients, getClientSocket: () => mockClients.get('client1') } }
});
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

jest.mock('jsonwebtoken');

describe('verifyToken middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClients.clear();
    mockClients.set('client1', { readyState: 1, send: mockSend });
  });

  test('should skip token check for /login', async () => {
    const req = mockRequest({}, '/login');
    const res = mockResponse();

    await verifyToken(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('should return 401 for missing token', async () => {
    const req = mockRequest({}, '/weather');
    const res = mockResponse();

    await verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ success: false, error: 'No token provided' }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 for invalid token', async () => {
    const req = mockRequest({ authorization: 'Bearer invalid-token' }, '/weather');
    const res = mockResponse();
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ success: false, error: 'Invalid token' }));
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should call next for valid token', async () => {
    const req = mockRequest({ authorization: 'Bearer valid-token' }, '/weather');
    const res = mockResponse();
    jwt.verify.mockReturnValue({ username: 'user' });

    await verifyToken(req, res, mockNext);

    expect(req.user).toEqual({ username: 'user' });
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('should not send WebSocket message if client socket is closed', async () => {
    const req = mockRequest({}, '/weather');
    const res = mockResponse();
    mockClients.set('client1', { readyState: 3, send: mockSend }); // WebSocket.CLOSED = 3

    await verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});
