import { createStore } from 'redux';
import { composeWithDevTools } from '@redux-devtools/extension';

const initialState = {
  weather: null,
  error: null,
  notification: null,
  showWeatherModal: false,
  token: localStorage.getItem('token') || null
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_WEATHER':
      return { ...state, weather: action.payload, error: null, showWeatherModal: true };
    case 'SET_ERROR':
      return { ...state, error: action.payload, weather: null, showWeatherModal: false };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };
    case 'CLEAR_WEATHER':
      return { ...state, weather: null, showWeatherModal: false };
    case 'SHOW_WEATHER_MODAL':
      return { ...state, showWeatherModal: true };
    case 'HIDE_WEATHER_MODAL':
      return { ...state, showWeatherModal: false };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    default:
      return state;
  }
};

const store = createStore(reducer, composeWithDevTools());
export default store;
