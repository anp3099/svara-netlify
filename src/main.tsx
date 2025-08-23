import { installCampaignsApiShim } from "@/services/campaigns-api-shim";
installCampaignsApiShim();
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { validateClientEnv } from './lib/validateEnv'

validateClientEnv()

// Ensure root element takes full viewport
const rootElement = document.getElementById('root')!
rootElement.style.width = '100%'
rootElement.style.height = '100%'

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Expose smoke test route in dev only (will be compiled out in production unless route added)
// The SmokeTest page is imported lazily via routing where needed.
