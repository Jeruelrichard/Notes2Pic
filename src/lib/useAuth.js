import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Tracks the current Supabase auth session and keeps it in sync.
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    user: session?.user ?? null,
    loading,
    signOut: () => supabase.auth.signOut(),
  }
}
