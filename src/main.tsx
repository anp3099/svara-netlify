import { validateClientEnv } from './lib/validateEnv';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Validate required env vars once at startup
validateClientEnv();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
