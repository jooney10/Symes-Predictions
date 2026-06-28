import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'join'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true); setError('')
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInErr) { setError('Incorrect email or password.'); setLoading(false); return }
    setLoading(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Please enter your full name'); return }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { display_name: trimmed } }
    })
    if (signUpErr || !data?.user) { setError(signUpErr?.message ?? 'Could not create account.'); setLoading(false); return }
    setLoading(false)
  }

  const inputClass = "w-full px-4 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gold/60 focus:bg-white/12 transition-all"

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 0%, #1a4a10 0%, #0f2d0a 50%, #050f03 100%)' }}>

      {/* Pitch line decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/4" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-white/3" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/3" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/3" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Badge / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 mb-5 shadow-2xl">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Symes' Predictions</h1>
          <p className="text-gold font-bold text-sm tracking-widest uppercase mt-1">League 2026/27</p>
        </div>

        {/* Card */}
        <div className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/12 p-6 shadow-2xl">

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-black/20 p-1 mb-5">
            <button onClick={() => { setMode('signin'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'signin' ? 'bg-gold text-black shadow-sm' : 'text-white/60 hover:text-white'}`}>
              Sign In
            </button>
            <button onClick={() => { setMode('join'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'join' ? 'bg-gold text-black shadow-sm' : 'text-white/60 hover:text-white'}`}>
              Join the League
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" autoFocus className={inputClass} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" className={inputClass} />
              {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gold text-black font-black text-sm hover:bg-yellow-300 disabled:opacity-50 transition-all shadow-lg shadow-gold/20 mt-1">
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" autoFocus className={inputClass} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" className={inputClass} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Choose a password (6+ characters)" className={inputClass} />
              {error && <p className="text-red-400 text-xs font-medium">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gold text-black font-black text-sm hover:bg-yellow-300 disabled:opacity-50 transition-all shadow-lg shadow-gold/20 mt-1">
                {loading ? 'Joining...' : 'Join the League →'}
              </button>
            </form>
          )}
        </div>

        {/* Scoring pills */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white/6 border border-white/10 rounded-xl p-3.5 text-center">
            <div className="text-xl font-black text-green-400">3 pts</div>
            <div className="text-white/50 text-xs mt-0.5">Correct result</div>
          </div>
          <div className="bg-white/6 border border-white/10 rounded-xl p-3.5 text-center">
            <div className="text-xl font-black text-gold">5 pts</div>
            <div className="text-white/50 text-xs mt-0.5">Exact score</div>
          </div>
        </div>
      </div>
    </div>
  )
}
