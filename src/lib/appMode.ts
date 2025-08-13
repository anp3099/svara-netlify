export const APP_MODE = (import.meta.env.VITE_APP_MODE ?? 'live') as 'live' | 'demo'

export const assertLive = () => {
  if (APP_MODE !== 'live') {
    throw new Error('This action requires live mode')
  }
}