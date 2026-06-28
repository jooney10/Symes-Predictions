import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Gameweek, Fixture } from '../lib/types'

export default function Admin() {
  const { profile, session } = useAuth()
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGw, setSelectedGw] = useState<Gameweek | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [scores, setScores] = useState<Record<number, { h: string; a: string }>>({})
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.from('gameweeks').select('*').order('number', { ascending: false })
      .then(({ data }) => {
        setGameweeks(data ?? [])
        setSelectedGw(data?.[0] ?? null)
      })
  }, [])

  useEffect(() => {
    if (!selectedGw) return
    supabase.from('fixtures').select('*').eq('gameweek_id', selectedGw.id).order('kickoff_at')
      .then(({ data }) => {
        setFixtures(data ?? [])
        const map: Record<number, { h: string; a: string }> = {}
        for (const f of data ?? []) map[f.id] = { h: f.home_score != null ? String(f.home_score) : '', a: f.away_score != null ? String(f.away_score) : '' }
        setScores(map)
      })
  }, [selectedGw?.id])

  if (!profile?.is_admin) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">🚫</div>
      <p className="text-gray-600 font-semibold">Admin access only</p>
    </div>
  )

  const isProcessed = selectedGw?.results_processed_at != null

  async function handleSaveScores() {
    if (!selectedGw) return
    const missing = fixtures.filter(f => !scores[f.id] || scores[f.id].h === '' || scores[f.id].a === '')
    if (missing.length) { setMessage({ type: 'err', text: `${missing.length} fixture(s) still need scores` }); return }
    setProcessing(true); setMessage(null)
    for (const f of fixtures) {
      await supabase.from('fixtures').update({
        home_score: parseInt(scores[f.id].h),
        away_score: parseInt(scores[f.id].a),
        status: 'FINISHED'
      }).eq('id', f.id)
    }
    setMessage({ type: 'ok', text: 'Scores saved! Now click "Process Results" to calculate points.' })
    setProcessing(false)
  }

  async function handleProcessResults() {
    if (!selectedGw || !session) return
    setProcessing(true); setMessage(null)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ gameweek_id: selectedGw.id }),
    })
    const json = await res.json()
    if (!res.ok) { setMessage({ type: 'err', text: json.error ?? 'Error processing results' }) }
    else {
      setMessage({ type: 'ok', text: `✅ GW${selectedGw.number} results processed! Points updated for all players.` })
      setSelectedGw(prev => prev ? { ...prev, is_open: false, results_processed_at: new Date().toISOString() } : prev)
    }
    setProcessing(false)
  }

  async function handleFetchFixtures() {
    if (!session) return
    setProcessing(true); setMessage(null)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-fixtures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: '{}',
    })
    const json = await res.json()
    if (!res.ok) setMessage({ type: 'err', text: json.error ?? 'Error fetching fixtures' })
    else setMessage({ type: 'ok', text: `✅ Fetched ${json.fixtures} fixtures for GW${json.gameweek}` })
    setProcessing(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">⚙️</span>
        <h1 className="text-2xl font-black text-gray-900">Admin Panel</h1>
      </div>

      {/* Actions */}
      <button onClick={handleFetchFixtures} disabled={processing}
        className="w-full mb-5 py-3 rounded-xl bg-pitch-light text-white font-bold hover:bg-pitch-pale disabled:opacity-50 transition-colors">
        🔄 Fetch Next Fixtures from API
      </button>

      {/* GW Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {gameweeks.map(gw => (
          <button key={gw.id} onClick={() => setSelectedGw(gw)}
            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${selectedGw?.id === gw.id ? 'bg-pitch-light text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-pitch-light'}`}>
            GW{gw.number}{gw.results_processed_at ? ' ✅' : ''}
          </button>
        ))}
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-4 text-sm font-semibold ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {selectedGw && (
        <div>
          <h2 className="font-bold text-gray-700 mb-3">
            GW{selectedGw.number} Scores {isProcessed && <span className="text-green-500 text-sm">✅ Processed</span>}
          </h2>

          <div className="space-y-2 mb-5">
            {fixtures.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                <span className="flex-1 text-right text-sm font-semibold text-gray-900">{f.home_team}</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="20"
                    value={scores[f.id]?.h ?? ''}
                    onChange={e => setScores(s => ({ ...s, [f.id]: { ...s[f.id], h: e.target.value } }))}
                    disabled={isProcessed}
                    className="w-12 h-10 text-center font-black text-lg border-2 border-pitch-light rounded-lg disabled:bg-gray-100 disabled:border-gray-200 focus:outline-none"
                    placeholder="0"
                  />
                  <span className="font-black text-gray-400">-</span>
                  <input type="number" min="0" max="20"
                    value={scores[f.id]?.a ?? ''}
                    onChange={e => setScores(s => ({ ...s, [f.id]: { ...s[f.id], a: e.target.value } }))}
                    disabled={isProcessed}
                    className="w-12 h-10 text-center font-black text-lg border-2 border-pitch-light rounded-lg disabled:bg-gray-100 disabled:border-gray-200 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-gray-900">{f.away_team}</span>
              </div>
            ))}
          </div>

          {!isProcessed && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSaveScores} disabled={processing}
                className="py-3 rounded-xl bg-pitch-light text-white font-bold hover:bg-pitch-pale disabled:opacity-50 transition-colors">
                💾 Save Scores
              </button>
              <button onClick={handleProcessResults} disabled={processing}
                className="py-3 rounded-xl bg-gold text-black font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors">
                🏆 Process Results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
