import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import MarketingHeader from './components/layout/MarketingHeader'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/auth/RequireAuth'

function App() {
  console.log('🔥 App component is rendering!')

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-50">
      <Router>
        <Routes>
          {/* Public marketing website */}
          <Route path="/" element={<Home />} />

          {/* Protected app routes */}
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          />

          {/* Legacy route redirects */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />

          {/* Fallback: render Home for unknown routes */}
          <Route path="*" element={<Home />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
