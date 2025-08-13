import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/auth/RequireAuth'

function App() {
  console.log('🔥 App component is rendering!')
  
  return (
    <div className="min-h-screen bg-red-500">
      <h1 className="text-white text-4xl p-8">App is working!</h1>
      <Router>
        <Routes>
          {/* Public marketing website */}
          <Route path="/" element={<Home />} />
          
          {/* Protected app routes */}
          <Route path="/app" element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          } />
          
          {/* Legacy route redirects */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App