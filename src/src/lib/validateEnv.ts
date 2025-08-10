// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Importing this runs the env validation at startup.
// If a required VITE_* var is missing, it will throw with a clear message.
import env from './lib/validateEnv'

// (Optional) confirm it's loaded — you can delete this line.
console.debug('[env OK]', env.VITE_BLINK_PROJECT_ID)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
