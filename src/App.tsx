import React, { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Profile } from './lib/types'
import Login from './pages/Login'
import Predictions from './pages/Predictions'
import Table from './pages/Table'
import Results from './pages/Results'
import Admin from './pages/Admin'

// ── Auth context ──────────────────────────────────────────────
interface AuthCtx { session: Session | null; profile: Profile | null; loading: boolean }
const AuthContext = createContext<AuthCtx>({ session: null, profile: null, loading: true })
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) fetchProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, profile, loading }}>{children}</AuthContext.Provider>
}

// ── Navigation ─────────────────────────────────────────────────
function Nav() {
  const { profile } = useAuth()
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isActive ? 'bg-gold text-black' : 'text-green-200 hover:text-white hover:bg-pitch-light'}`

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-pitch-dark shadow-lg sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="text-white font-black text-lg hidden sm:block">Symes' Predictions League</span>
          <span className="text-white font-black text-lg sm:hidden">SPL</span>
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/predictions" className={linkClass}>Predict</NavLink>
          <NavLink to="/table" className={linkClass}>Table</NavLink>
          <NavLink to="/results" className={linkClass}>Results</NavLink>
          {profile?.is_admin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
          <button
            onClick={handleSignOut}
            className="ml-2 px-3 py-2 text-sm text-green-300 hover:text-white border border-green-700 rounded-lg hover:border-green-400 transition-colors"
          >
            {profile?.display_name?.split(' ')[0]} ↗
          </button>
        </div>
      </div>
    </nav>
  )
}

// ── Guards ─────────────────────────────────────────────────────
function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-pitch-light text-xl animate-pulse">Loading...</div></div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Root ───────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={
            <Protected>
              <Nav />
              <main className="max-w-5xl mx-auto px-4 py-6">
                <Routes>
                  <Route path="/predictions" element={<Predictions />} />
                  <Route path="/table" element={<Table />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<Navigate to="/predictions" replace />} />
                </Routes>
              </main>
            </Protected>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function LoginGuard() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/predictions" replace />
  return <Login />
}
