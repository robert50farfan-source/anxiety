import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({ userId: null, isReady: false })

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  // Pre-seed from localStorage so UI doesn't flash on reload
  const [userId, setUserId]   = useState(() => localStorage.getItem('anxietyapp_uid'))
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setIsReady(true)
      return
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        await hydrate(session.user.id)
      } else {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (data?.user && !error) await hydrate(data.user.id)
      }
      setIsReady(true)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUserId(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function hydrate(uid) {
    setUserId(uid)
    localStorage.setItem('anxietyapp_uid', uid)

    // Create profile row if this is a new user (upsert ignores existing rows)
    await supabase
      .from('perfiles')
      .upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true })
  }

  return (
    <AuthContext.Provider value={{ userId, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}
