import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Gameweek, Fixture, Prediction } from '../lib/types'

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

function kickoffLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function gwLabel(gw: Gameweek) {
  if (gw.results_processed_at) return { badge: '✅', colour: 'text-green-500' }
  if (gw.is_open) return { badge: '🟢', colour: 'text-green-400' }
  return { badge: '', colour: 'text-gray-300' }
}

export default function Predictions() {
  const { profile } = useAuth()
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGw, setSelectedGw] = useState<Gameweek | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [scores, setScores] = useState<Record<number, { h: string; a: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [loadingGws, setLoadingGws] = useState(true)
  const [loadingFixtures, setLoadingFixtures] = useState(false)

  // Load all gameweeks on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('gameweeks').select('*').order('number', { ascending: true })
      const gws = data ?? []
      setGameweeks(gws)

      // Default: first open GW, else first future GW, else first GW
      const now = Date.now()
      const openGw = gws.find(g => g.is_open)
      const nextGw = gws.find(g => !g.results_processed_at && new Date(g.deadline_at).getTime() > now)
      setSelectedGw(openGw ?? nextGw ?? gws[0] ?? null)
      setLoadingGws(false)
    }
    load()
  }, [])

  // Load fixtures + predictions when GW changes
  useEffect(() => {
    if (!selectedGw || !profile?.id) return
    setLoadingFixtures(true)
    Promise.all([
      supabase.from('fixtures').select('*').eq('gameweek_id', selectedGw.id).order('kickoff_at'),
      supabase.from('predictions').select('*').eq('gameweek_id', selectedGw.id).eq('user_id', profile.id),
    ]).then(([fxRes, predRes]) => {
      setFixtures(fxRes.data ?? [])
      const predMap: Record<number, Prediction> = {}
      const scoreMap: Record<number, { h: string; a: string }> = {}
      for (const p of predRes.data ?? []) {
        predMap[p.fixture_id] = p
        scoreMap[p.fixture_id] = { h: String(p.predicted_home), a: String(p.predicted_away) }
      }
      setPredictions(predMap)
      setScores(scoreMap)
      setLoadingFixtures(false)
    })
  }, [selectedGw?.id, profile?.id])

  async function savePrediction(fixtureId: number) {
    if (!selectedGw || !profile || !selectedGw.is_open) return
    const s = scores[fixtureId]
    if (!s || s.h === '' || s.a === '') return
    setSaving(fixtureId)
    const { data } = await supabase.from('predictions').upsert({
      user_id: profile.id,
      fixture_id: fixtureId,
      gameweek_id: selectedGw.id,
      predicted_home: parseInt(s.h),
      predicted_away: parseInt(s.a),
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,fixture_id' }).select().single()
    if (data) setPredictions(p => ({ ...p, [fixtureId]: data }))
    setSaving(null)
  }

  if (loadingGws) return (
    <div className="flex justify-center py-20">
      <div className="text-pitch-light text-lg animate-pulse">Loading...</div>
    </div>
  )

  if (gameweeks.length === 0) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🏟️</div>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">Season not set up yet</h2>
      <p className="text-gray-500">Ask the admin to import the 2026/27 fixtures.</p>
    </div>
  )

  const isOpen = selectedGw?.is_open ?? false
  const deadlinePassed = selectedGw ? new Date(selectedGw.deadline_at).getTime() < Date.now() : false
  const canPredict = isOpen && !deadlinePassed
  const submitted = Object.keys(predictions).length
  const remaining = timeUntil(selectedGw?.deadline_at ?? '')

  return (
    <div>
      {/* GW Picker */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {gameweeks.map(gw => {
          const { badge, colour } = gwLabel(gw)
          const isSelected = selectedGw?.id === gw.id
          return (
            <button key={gw.id} onClick={() => setSelectedGw(gw)}
              className={`shrink-0 px-3 py-2 rounded-xl font-bold text-xs transition-all min-w-[52px] ${
                isSelected
                  ? 'bg-pitch-dark text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-pitch-light'
              }`}>
              GW{gw.number}
              <span className={`block text-center mt-0.5 text-xs ${isSelected ? colour : colour}`}>
                {badge || (gw.is_open ? '🟢' : '·')}
              </span>
            </button>
          )
        })}
      </div>

      {selectedGw && (
        <>
          {/* GW Header */}
          <div className="rounded-2xl mb-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f2d0a 0%, #1a4a10 100%)' }}>
            <div className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-0.5">2026/27 Season</p>
                <h1 className="text-white font-black text-2xl">Gameweek {selectedGw.number}</h1>
                <p className={`text-sm font-semibold mt-1 ${
                  canPredict ? 'text-gold' :
                  isOpen && deadlinePassed ? 'text-red-400' :
                  selectedGw.results_processed_at ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {selectedGw.results_processed_at ? '✅ Results processed' :
                   canPredict ? `⏱ ${remaining} remaining` :
                   deadlinePassed ? '🔒 Deadline passed' :
                   '🔒 Not open yet'}
                </p>
              </div>
              {canPredict && (
                <div className="text-right shrink-0">
                  <div className="text-3xl font-black text-white">{submitted}<span className="text-green-400 text-xl">/{fixtures.length}</span></div>
                  <div className="text-green-400 text-xs uppercase tracking-widest mt-0.5">Entered</div>
                </div>
              )}
            </div>
            {canPredict && fixtures.length > 0 && (
              <div className="h-1 bg-black/20">
                <div className="h-full bg-gold transition-all duration-500"
                  style={{ width: `${(submitted / fixtures.length) * 100}%` }} />
              </div>
            )}
          </div>

          {/* Not open banner */}
          {!canPredict && !selectedGw.results_processed_at && (
            <div className={`rounded-xl p-4 mb-4 text-sm font-semibold text-center ${
              deadlinePassed
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {deadlinePassed
                ? '🔒 The deadline has passed — predictions are locked for this gameweek.'
                : '⏳ This gameweek isn\'t open for predictions yet. Check back closer to the deadline.'}
            </div>
          )}

          {/* Fixtures */}
          {loadingFixtures ? (
            <div className="flex justify-center py-10">
              <div className="text-pitch-light animate-pulse">Loading fixtures...</div>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <div className="text-4xl mb-2">📅</div>
              No fixtures scheduled yet for GW{selectedGw.number}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {fixtures.map(fixture => {
                const pred = predictions[fixture.id]
                const sc = scores[fixture.id] ?? { h: '', a: '' }
                const isSaved = !!pred
                const isSaving = saving === fixture.id

                return (
                  <div key={fixture.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isSaved ? 'border-green-500/40' : 'border-gray-100'
                    } bg-white`}>
                    <div className="bg-pitch-dark px-4 py-1.5 text-center">
                      <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">
                        {kickoffLabel(fixture.kickoff_at)}
                      </span>
                    </div>
                    <div className="flex items-center px-3 py-3 gap-2">
                      <div className="flex-1 text-right pr-2">
                        <span className="font-black text-gray-900 text-sm sm:text-base">{fixture.home_team}</span>
                        <div className="text-xs text-gray-400 mt-0.5">Home</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number" min="0" max="20"
                          value={sc.h}
                          onChange={e => setScores(s => ({ ...s, [fixture.id]: { ...sc, h: e.target.value } }))}
                          onBlur={() => savePrediction(fixture.id)}
                          disabled={!canPredict}
                          className="w-11 h-11 text-center text-lg font-black rounded-lg border-2 border-pitch-light focus:outline-none focus:border-pitch-pale disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200 transition-all"
                        />
                        <span className="text-gray-300 font-black text-lg">–</span>
                        <input
                          type="number" min="0" max="20"
                          value={sc.a}
                          onChange={e => setScores(s => ({ ...s, [fixture.id]: { ...sc, a: e.target.value } }))}
                          onBlur={() => savePrediction(fixture.id)}
                          disabled={!canPredict}
                          className="w-11 h-11 text-center text-lg font-black rounded-lg border-2 border-pitch-light focus:outline-none focus:border-pitch-pale disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200 transition-all"
                        />
                      </div>
                      <div className="flex-1 pl-2">
                        <span className="font-black text-gray-900 text-sm sm:text-base">{fixture.away_team}</span>
                        <div className="text-xs text-gray-400 mt-0.5">Away</div>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 text-center text-xs font-bold transition-all ${
                      isSaving ? 'bg-blue-50 text-blue-500' :
                      isSaved ? 'bg-green-50 text-green-600' :
                      canPredict ? 'bg-gray-50 text-gray-300' :
                      pred ? 'bg-green-50 text-green-600' :
                      'bg-gray-50 text-gray-300'
                    }`}>
                      {isSaving ? '⏳ Saving...' :
                       isSaved ? `✓ ${pred.predicted_home}–${pred.predicted_away}` :
                       canPredict ? 'Enter your prediction' :
                       'No prediction entered'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
