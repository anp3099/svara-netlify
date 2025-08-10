import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import { RobustAppLayout } from './components/layout/RobustAppLayout'
import { RequireAuth } from './components/auth/RequireAuth'
import { Toaster } from './components/ui/toaster'

function App() {
  console.log('🔥 App component is rendering!')
  
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Public marketing website */}
          <Route path="/" element={<Home />} />
          
          {/* Protected app routes */}
          <Route path="/app" element={
            <RequireAuth>
              <RobustAppLayout />
            </RequireAuth>
          } />
          
          {/* Legacy route redirects */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        </Routes>
        
        <Toaster />
      </div>
    </Router>
  )
}

export default App