import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

// Converts a display name to a stable fake email + password for Supabase auth
// e.g. "Jonny Symes" → "jonnysymes@spl.app" / password: "SPL-jonnysymes"
function nameToCredentials(name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  return {
    email: `${slug}@spl.app`,
    password: `SPL-${slug}-2025`,
  }
}

export default function Login() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Please enter your full name'); return }
    setLoading(true); setError('')

    const { email, password } = nameToCredentials(trimmed)

    // Try signing in first (returning user)
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    if (signInData?.user) {
      // Existing user — check profile exists
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', signInData.user.id).single()
      if (!existing) {
        // Profile missing — create it
        await supabase.from('profiles').insert({ id: signInData.user.id, display_name: trimmed, email, is_admin: false })
      }
      setLoading(false)
      return
    }

    // Sign in failed — try signing up (new user)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email, password, options: { data: { display_name: trimmed } }
    })

    if (signUpErr || !signUpData?.user) {
      setError('Could not join. Please check your name and try again.')
      setLoading(false)
      return
    }

    // Profile is created automatically by database trigger
    setLoading(false)
    // Auth state change in App.tsx will redirect automatically
  }

  return (
    <div className="min-h-screen bg-pitch-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-8xl mb-4">⚽</div>
          <h1 className="text-4xl font-black text-white leading-tight mb-2">
            Symes' Predictions<br />League
          </h1>
          <p className="text-green-400 text-lg">Enter your name to get started</p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name (e.g. Jonny Symes)"
            autoFocus
            className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-green-400/60 text-lg focus:outline-none focus:border-gold focus:bg-white/15 transition-all"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            className="w-full py-4 rounded-xl bg-gold text-black font-black text-lg hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Joining...' : 'Join the League →'}
          </button>
        </form>

        <p className="text-center text-green-600 text-sm mt-8">
          Already joined? Just enter the same name you used before.
        </p>

        {/* Scoring */}
        <div className="mt-10 grid grid-cols-2 gap-3">
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
