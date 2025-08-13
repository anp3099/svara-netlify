import { useState, useEffect } from 'react'
import { blink } from '../blink/client'

interface AuthState {
  user: any | null
  loading: boolean
  isAuthenticated: boolean
  userPlan: string
  signIn: (redirectUrl?: string) => void
  signOut: () => void
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<string>('starter')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      
      if (state.user) {
        try {
          // Fetch user's current plan from database
          const users = await blink.db.users.list({
            where: { id: state.user.id },
            limit: 1
          })
          
          if (users.length > 0) {
            setUserPlan(users[0].planType || 'starter')
          }
        } catch (error) {
          console.error('Error fetching user plan:', error)
          setUserPlan('starter') // Default to starter on error
        }
      } else {
        setUserPlan('starter')
      }
    })
    
    return unsubscribe
  }, [])

  const signIn = (redirectUrl?: string) => {
    const url = redirectUrl || window.location.href
    blink.auth.login(url)
  }

  const signOut = () => {
    blink.auth.logout()
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    userPlan,
    signIn,
    signOut
  }
}