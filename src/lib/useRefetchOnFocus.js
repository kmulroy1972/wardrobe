import { useEffect } from 'react'

// Re-fetch data when the app regains focus (tab switch, phone unlock,
// PWA resume) so edits made elsewhere are never invisible.
export default function useRefetchOnFocus(refetch) {
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [refetch])
}
