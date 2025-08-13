import { useEffect } from 'react'
import { useBlink } from '@blinkdotnew/react'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useBlink()
  useEffect(() => {
    if (!loading && !user) signIn()
  }, [loading, user, signIn])
  if (loading) return null
  return <>{children}</>
}