import { useEffect, ReactNode, useState } from 'react'
import { blink } from '../../blink/client'

interface RequireAuthProps {
  children: ReactNode
  redirectUrl?: string
}

export function RequireAuth({ children, redirectUrl }: RequireAuthProps) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  console.log('🔥 RequireAuth rendering, user:', user, 'loading:', loading)

  useEffect(() => {
    console.log('🔥 RequireAuth useEffect running')
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      console.log('🔥 Auth state changed:', state)
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    console.log('🔥 RequireAuth auth check, loading:', loading, 'user:', user)
    // If not loading and no user, redirect to sign in
    if (!loading && !user) {
      console.log('🔥 Redirecting to login')
      const currentUrl = redirectUrl || window.location.href
      blink.auth.login(currentUrl)
    }
  }, [loading, user, redirectUrl])

  // Show loading spinner while auth is initializing
  if (loading) {
    console.log('🔥 Showing loading state')
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  // If no user after loading, show sign in prompt (fallback)
  if (!user) {
    console.log('🔥 Showing sign in prompt')
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to access this page.</p>
          <button 
            onClick={() => {
              const currentUrl = redirectUrl || window.location.href
              blink.auth.login(currentUrl)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  console.log('🔥 User authenticated, rendering children')
  return <>{children}</>
}