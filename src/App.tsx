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
import About from './pages/About'

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
    <>
      {/* Top nav */}
      <nav className="sticky top-0 z-50 border-b border-white/8"
        style={{ background: 'linear-gradient(180deg, #0a200a 0%, #0f2d0a 100%)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/15">
              <span className="text-base">⚽</span>
            </div>
            <div>
              <div className="text-white font-black text-sm leading-tight">Symes' Predictions</div>
              <div className="text-gold text-xs font-bold tracking-widest uppercase leading-tight">League</div>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-0.5">
            <NavLink to="/predictions" className={linkClass}>Predict</NavLink>
            <NavLink to="/table" className={linkClass}>Table</NavLink>
            <NavLink to="/results" className={linkClass}>Results</NavLink>
            <NavLink to="/about" className={linkClass}>About</NavLink>
            {profile?.is_admin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
            <button onClick={handleSignOut}
              className="ml-2 px-3 py-2 text-xs text-green-300/70 hover:text-white border border-white/10 rounded-lg hover:border-white/25 transition-all font-semibold">
              {profile?.display_name?.split(' ')[0]} ↗
            </button>
          </div>

          {/* Mobile: just sign out */}
          <button onClick={handleSignOut} className="sm:hidden px-3 py-1.5 text-xs text-green-300/70 border border-white/10 rounded-lg font-semibold">
            {profile?.display_name?.split(' ')[0]} ↗
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 pb-safe"
        style={{ background: 'linear-gradient(0deg, #0a200a 0%, #0f2d0a 100%)' }}>
        <div className="flex">
          {[
            { to: '/predictions', icon: '⚽', label: 'Predict' },
            { to: '/table', icon: '🏆', label: 'Table' },
            { to: '/results', icon: '📊', label: 'Results' },
            { to: '/about', icon: '📖', label: 'About' },
            ...(profile?.is_admin ? [{ to: '/admin', icon: '⚙️', label: 'Admin' }] : []),
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 text-center transition-colors ${isActive ? 'text-gold' : 'text-green-600 hover:text-green-300'}`
              }>
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-xs font-semibold mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
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
              <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
                <Routes>
                  <Route path="/predictions" element={<Predictions />} />
                  <Route path="/table" element={<Table />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/about" element={<About />} />
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
