import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { Title, Form, Input, Button, Notification, NotificationButton } from './style';
import log from './utils/log';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientId] = useState(Date.now().toString());
  const notification = useSelector((state) => state.notification);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    log.debug(`[HTTP] Sending login request to http://localhost:3100/login with body: ${JSON.stringify({ username, password })} and headers: { "x-client-id": "${clientId}" }`);
    try {
      const response = await axios.post('http://localhost:3100/login', { username, password }, {
        headers: { 'x-client-id': clientId }
      });
      log.debug(`[HTTP] Login response: ${JSON.stringify(response.data)}`);
      localStorage.setItem('token', response.data.token);
      dispatch({ type: 'SET_TOKEN', payload: response.data.token });
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Login successful!' });
      setUsername('');
      setPassword('');
      navigate('/weather');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error logging in';
      log.debug(`[HTTP] Login error: ${errorMsg}`);
      dispatch({ type: 'SET_NOTIFICATION', payload: `Error: ${errorMsg}` });
    }
  };

  const dismissNotification = () => {
    log.debug('[Login] Dismissing notification');
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  };

  return (
    <>
      <Title>Weather App (Australia) - Login</Title>
      <Form onSubmit={handleLogin}>
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit">Login</Button>
      </Form>
      {notification && (
        <Notification isError={notification.includes('Error')}>
          {notification}
          <NotificationButton onClick={dismissNotification}>Dismiss</NotificationButton>
        </Notification>
      )}
    </>
  );
}

export default Login;
