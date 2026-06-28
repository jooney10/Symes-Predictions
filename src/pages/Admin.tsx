import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Gameweek, Fixture } from '../lib/types'

interface Player {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  created_at: string
}

function formatDeadline(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function gwStatus(gw: Gameweek): { label: string; colour: string } {
  if (gw.results_processed_at) return { label: '✅ Done', colour: 'text-green-600' }
  if (gw.is_open) return { label: '🟢 Open', colour: 'text-green-500' }
  const deadlinePassed = new Date(gw.deadline_at).getTime() < Date.now()
  if (deadlinePassed) return { label: '🔒 Locked', colour: 'text-amber-500' }
  return { label: '⏳ Upcoming', colour: 'text-gray-400' }
}

export default function Admin() {
  const { profile, session } = useAuth()
  const [tab, setTab] = useState<'fixtures' | 'players'>('fixtures')
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGw, setSelectedGw] = useState<Gameweek | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [scores, setScores] = useState<Record<number, { h: string; a: string }>>({})
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  async function loadGameweeks() {
    const { data } = await supabase.from('gameweeks').select('*').order('number', { ascending: true })
    const gws = data ?? []
    setGameweeks(gws)
    if (!selectedGw) setSelectedGw(gws[0] ?? null)
  }

  useEffect(() => { loadGameweeks() }, [])

  useEffect(() => {
    if (tab !== 'players' || players.length > 0) return
    setLoadingPlayers(true)
    supabase.from('profiles').select('*').order('created_at', { ascending: true })
      .then(({ data }) => { setPlayers(data ?? []); setLoadingPlayers(false) })
  }, [tab])

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

  async function handleImportSeason() {
    if (!session) return
    setProcessing(true); setMessage(null)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-fixtures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: '{}',
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage({ type: 'err', text: json.error ?? `Error (${res.status}) — check edge function logs` })
    } else {
      setMessage({ type: 'ok', text: `✅ Synced ${json.fixtures} fixtures across ${json.gameweeks} gameweeks` })
      await loadGameweeks()
    }
    setProcessing(false)
  }

  async function handleToggleOpen() {
    if (!selectedGw) return
    setProcessing(true)
    const { data } = await supabase.from('gameweeks')
      .update({ is_open: !selectedGw.is_open })
      .eq('id', selectedGw.id)
      .select().single()
    if (data) {
      const updated = { ...selectedGw, is_open: data.is_open }
      setSelectedGw(updated)
      setGameweeks(gws => gws.map(g => g.id === updated.id ? updated : g))
    }
    setProcessing(false)
  }

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
    if (!selectedGw) return
    setProcessing(true); setMessage(null)
    const { error } = await supabase.rpc('process_gameweek_results', { p_gameweek_id: selectedGw.id })
    if (error) {
      setMessage({ type: 'err', text: error.message ?? 'Error processing results' })
    } else {
      const updated = { ...selectedGw, is_open: false, results_processed_at: new Date().toISOString() }
      setSelectedGw(updated)
      setGameweeks(gws => gws.map(g => g.id === updated.id ? updated : g))
      setMessage({ type: 'ok', text: `✅ GW${selectedGw.number} results processed! Points updated for all players.` })
    }
    setProcessing(false)
  }

  const status = selectedGw ? gwStatus(selectedGw) : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pitch-dark flex items-center justify-center">
          <span className="text-xl">⚙️</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-400">2026/27 Season</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
        <button onClick={() => setTab('fixtures')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'fixtures' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          🏟 Fixtures
        </button>
        <button onClick={() => setTab('players')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'players' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          👥 Players {players.length > 0 && <span className="ml-1 text-xs text-gray-400">({players.length})</span>}
        </button>
      </div>

      {/* Players tab */}
      {tab === 'players' && (
        <div>
          {loadingPlayers ? (
            <div className="flex justify-center py-10"><div className="text-pitch-light animate-pulse">Loading players...</div></div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-pitch-dark px-4 py-3 flex items-center justify-between">
                <span className="text-white font-black text-sm">Registered Players</span>
                <span className="text-green-400 text-sm font-bold">{players.length} total</span>
              </div>
              {players.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0 ${p.id === profile?.id ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pitch-dark flex items-center justify-center text-white text-xs font-black shrink-0">
                      {p.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {p.display_name}
                        {p.id === profile?.id && <span className="text-xs text-gray-400 font-normal">(you)</span>}
                        {p.is_admin && <span className="text-xs bg-gold/20 text-amber-700 font-bold px-1.5 py-0.5 rounded">Admin</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.email}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 text-right shrink-0">
                    Joined {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">No players registered yet.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fixtures tab */}
      {tab === 'fixtures' && <>

      {/* Import / Sync */}
      <button onClick={handleImportSeason} disabled={processing}
        className="w-full mb-5 py-3.5 rounded-xl bg-pitch-dark text-white font-bold hover:bg-pitch-mid disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        🔄 Import / Sync 2026/27 Season
      </button>

      {/* GW Picker */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5">
        {gameweeks.map(gw => {
          const s = gwStatus(gw)
          const isSelected = selectedGw?.id === gw.id
          return (
            <button key={gw.id} onClick={() => setSelectedGw(gw)}
              className={`shrink-0 px-3 py-2 rounded-xl font-bold text-xs transition-all ${isSelected ? 'bg-pitch-dark text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-pitch-light'}`}>
              GW{gw.number}
              <span className={`block text-center mt-0.5 ${isSelected ? 'text-green-300' : s.colour} text-xs font-normal`}>
                {gw.results_processed_at ? '✅' : gw.is_open ? '🟢' : '–'}
              </span>
            </button>
          )
        })}
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-4 text-sm font-semibold ${message.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {selectedGw && (
        <div>
          {/* GW Info bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="font-black text-gray-900 text-lg">Gameweek {selectedGw.number}</div>
              <div className="text-xs text-gray-400 mt-0.5">Deadline: {formatDeadline(selectedGw.deadline_at)}</div>
              <div className={`text-sm font-bold mt-1 ${status?.colour}`}>{status?.label}</div>
            </div>
            {!isProcessed && (
              <button onClick={handleToggleOpen} disabled={processing}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedGw.is_open
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                } disabled:opacity-50`}>
                {selectedGw.is_open ? '🔒 Lock GW' : '🟢 Open GW'}
              </button>
            )}
          </div>

          {/* Fixtures / Scores */}
          {fixtures.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              No fixtures yet — import the season first.
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {fixtures.map(f => (
                <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                  <div className="flex-1 text-right">
                    <div className="text-sm font-bold text-gray-900">{f.home_team}</div>
                    <div className="text-xs text-gray-400">{new Date(f.kickoff_at).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input type="number" min="0" max="20"
                      value={scores[f.id]?.h ?? ''}
                      onChange={e => setScores(s => ({ ...s, [f.id]: { ...s[f.id], h: e.target.value } }))}
                      disabled={isProcessed}
                      className="w-12 h-10 text-center font-black text-lg border-2 border-pitch-light rounded-lg disabled:bg-gray-100 disabled:border-gray-200 focus:outline-none"
                      placeholder="0"
                    />
                    <span className="font-black text-gray-300">–</span>
                    <input type="number" min="0" max="20"
                      value={scores[f.id]?.a ?? ''}
                      onChange={e => setScores(s => ({ ...s, [f.id]: { ...s[f.id], a: e.target.value } }))}
                      disabled={isProcessed}
                      className="w-12 h-10 text-center font-black text-lg border-2 border-pitch-light rounded-lg disabled:bg-gray-100 disabled:border-gray-200 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1 text-sm font-bold text-gray-900">{f.away_team}</div>
                </div>
              ))}
            </div>
          )}

          {!isProcessed && fixtures.length > 0 && (
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

      </>}
    </div>
  )
}
