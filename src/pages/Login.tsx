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
    if (signInErr) {
      setError('Incorrect email or password. Try again or join the league.')
      setLoading(false)
      return
    }
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
      email: email.trim(),
      password,
      options: { data: { display_name: trimmed } }
    })

    if (signUpErr || !data?.user) {
      setError(signUpErr?.message ?? 'Could not create account. Try again.')
      setLoading(false)
      return
    }
    setLoading(false)
  }

  const inputClass = "w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-green-400/60 text-base focus:outline-none focus:border-gold focus:bg-white/15 transition-all"

  return (
    <div className="min-h-screen bg-pitch-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">⚽</div>
          <h1 className="text-4xl font-black text-white leading-tight mb-2">
            Symes' Predictions<br />League
          </h1>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-white/10 p-1 mb-6">
          <button
            onClick={() => { setMode('signin'); setError('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'signin' ? 'bg-gold text-black' : 'text-green-300 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('join'); setError('') }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'join' ? 'bg-gold text-black' : 'text-green-300 hover:text-white'}`}
          >
            Join the League
          </button>
        </div>

        {/* Form */}
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              autoFocus
              className={inputClass}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gold text-black font-black text-lg hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name (e.g. Jonny Symes)"
              autoFocus
              className={inputClass}
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className={inputClass}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Choose a password (6+ characters)"
              className={inputClass}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gold text-black font-black text-lg hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Joining...' : 'Join the League →'}
            </button>
          </form>
        )}

        {/* Scoring */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-400">3 pts</div>
            <div className="text-green-300 text-sm mt-1">Correct result</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-gold">5 pts</div>
            <div className="text-green-300 text-sm mt-1">Exact score</div>
          </div>
        </div>
      </div>
    </div>
  )
}
