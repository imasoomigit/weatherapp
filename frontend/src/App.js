import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Container } from './style';
import Login from './Login';
import Weather from './Weather';

function App() {
  const isLoggedIn = useSelector((state) => state.token !== null);

  return (
    <Container>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/weather"
          element={isLoggedIn ? <Weather /> : <Navigate to="/" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Container>
  );
}

export default App;
