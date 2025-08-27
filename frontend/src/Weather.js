import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Title, Form, Input, Select, Button, Notification, NotificationButton, Modal, ModalContent, ModalButton, WeatherInfo, ErrorMessage } from './style';
import log from './utils/log';

function Weather() {
  const [location, setLocation] = useState('');
  const [units, setUnits] = useState('metric');
  const [clientId] = useState(Date.now().toString());
  const weather = useSelector((state) => state.weather);
  const error = useSelector((state) => state.error);
  const notification = useSelector((state) => state.notification);
  const showWeatherModal = useSelector((state) => state.showWeatherModal);
  const token = useSelector((state) => state.token);
  const dispatch = useDispatch();
  const [ws, setWs] = useState(null);

  useEffect(() => {
    log.debug(`[WebSocket] Initializing WebSocket connection with clientId: ${clientId}`);
    const websocket = new WebSocket(`ws://localhost:3100?clientId=${clientId}`);
    setWs(websocket);

    websocket.onopen = () => {
      log.debug(`[WebSocket] Connection established for clientId: ${clientId}`);
    };

    websocket.onmessage = (event) => {
      log.debug(`[WebSocket] Received message: ${event.data}`);
      try {
        const response = JSON.parse(event.data);
        log.debug(`[WebSocket] Parsed response: ${JSON.stringify(response)}`);
        if (response.success) {
          dispatch({ type: 'SET_WEATHER', payload: response.data });
          dispatch({ type: 'SET_NOTIFICATION', payload: `Weather info extracted for ${response.data.city}` });
        } else {
          dispatch({ type: 'SET_ERROR', payload: response.error === 'Invalid token' || response.error === 'No token provided' ? response.error : `Error retrieving weather for ${location}` });
          dispatch({ type: 'SET_NOTIFICATION', payload: `Error: ${response.error === 'Invalid token' || response.error === 'No token provided' ? response.error : `Error retrieving weather for ${location}`}` });
          if (response.error === 'Invalid token' || response.error === 'No token provided') {
            localStorage.removeItem('token');
            dispatch({ type: 'SET_TOKEN', payload: null });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Error: Session expired, please log in again' });
          }
        }
      } catch (error) {
        log.debug(`[WebSocket] Error parsing message: ${error.message}`);
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Error: Invalid message format' });
      }
    };

    websocket.onclose = () => {
      log.debug(`[WebSocket] Connection closed for clientId: ${clientId}`);
    };

    return () => {
      log.debug(`[WebSocket] Closing WebSocket connection for clientId: ${clientId}`);
      websocket.close();
    };
  }, [dispatch, clientId, location]);

  const handleWeatherRequest = (e) => {
    e.preventDefault();
    if (!location) {
      log.debug('[WebSocket] Validation failed: Location is required');
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Error: Location is required' });
      return;
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: 'weather', location, units, token });
      log.debug(`[WebSocket] Sending weather request: ${message}`);
      ws.send(message);
    } else {
      log.debug('[WebSocket] Error: WebSocket not connected');
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Error: WebSocket not connected' });
    }
  };

  const dismissNotification = () => {
    log.debug('[Weather] Dismissing notification');
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  };

  const dismissModal = () => {
    log.debug('[Weather] Dismissing modal');
    dispatch({ type: 'HIDE_WEATHER_MODAL' });
  };

  return (
    <>
      <Title>Weather App (Australia) - Weather</Title>
      <Form onSubmit={handleWeatherRequest}>
        <Input
          type="text"
          placeholder="Enter city/suburb"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
        <Select value={units} onChange={(e) => setUnits(e.target.value)}>
          <option value="metric">Metric (°C)</option>
          <option value="imperial">Imperial (°F)</option>
        </Select>
        <Button type="submit">Get Weather</Button>
      </Form>
      {notification && (
        <Notification isError={notification.includes('Error')}>
          {notification}
          <NotificationButton onClick={dismissNotification}>Dismiss</NotificationButton>
        </Notification>
      )}
      {showWeatherModal && weather && (
        <Modal>
          <ModalContent>
            <h3>Weather in {weather.city}</h3>
            <p>Temperature: {weather.temperature}{weather.units}</p>
            <p>Description: {weather.description}</p>
            <ModalButton onClick={dismissModal}>OK</ModalButton>
          </ModalContent>
        </Modal>
      )}
      {weather && (
        <WeatherInfo>
          <h3>Weather in {weather.city}</h3>
          <p>Temperature: {weather.temperature}{weather.units}</p>
          <p>Description: {weather.description}</p>
        </WeatherInfo>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
}

export default Weather;
