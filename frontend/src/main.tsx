import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { applyAppTheme, getStoredTheme } from './theme/themeManager';

// Guarantee theme is synchronized on application entry
applyAppTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
