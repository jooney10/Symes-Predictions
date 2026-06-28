import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Gameweek, Fixture, Prediction } from '../lib/types'

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Deadline passed'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`
  return `${h}h ${m}m remaining`
}

function kickoffLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export default function Predictions() {
  const { profile } = useAuth()
  const [gw, setGw] = useState<Gameweek | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [scores, setScores] = useState<Record<number, { h: string; a: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: gws } = await supabase
        .from('gameweeks').select('*').eq('is_open', true)
        .order('number', { ascending: false }).limit(1)
      const gameweek = gws?.[0] ?? null
      setGw(gameweek)
      if (!gameweek) { setLoading(false); return }

      const { data: fx } = await supabase
        .from('fixtures').select('*').eq('gameweek_id', gameweek.id).order('kickoff_at')
      setFixtures(fx ?? [])

      if (profile?.id) {
        const { data: preds } = await supabase
          .from('predictions').select('*')
          .eq('gameweek_id', gameweek.id).eq('user_id', profile.id)
        const map: Record<number, Prediction> = {}
        const scoreMap: Record<number, { h: string; a: string }> = {}
        for (const p of preds ?? []) {
          map[p.fixture_id] = p
          scoreMap[p.fixture_id] = { h: String(p.predicted_home), a: String(p.predicted_away) }
        }
        setPredictions(map)
        setScores(scoreMap)
      }
      setLoading(false)
    }
    load()
  }, [profile?.id])

  async function savePrediction(fixtureId: number) {
    if (!gw || !profile) return
    const s = scores[fixtureId]
    if (!s || s.h === '' || s.a === '') return
    setSaving(fixtureId)
    const { data } = await supabase.from('predictions').upsert({
      user_id: profile.id,
      fixture_id: fixtureId,
      gameweek_id: gw.id,
      predicted_home: parseInt(s.h),
      predicted_away: parseInt(s.a),
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,fixture_id' }).select().single()
    if (data) setPredictions(p => ({ ...p, [fixtureId]: data }))
    setSaving(null)
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="text-pitch-light text-lg animate-pulse">Loading fixtures...</div>
    </div>
  )

  if (!gw) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🏟️</div>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">Season hasn't started yet</h2>
      <p className="text-gray-500">Fixtures will appear here once the gameweek opens.</p>
    </div>
  )

  const submitted = Object.keys(predictions).length
  const isOpen = gw.is_open
  const deadlinePassed = new Date(gw.deadline_at).getTime() < Date.now()

  return (
    <div>
      {/* GW Header */}
      <div className="rounded-2xl mb-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d0a 0%, #1a4a10 100%)' }}>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-1">2026/27 Season</p>
            <h1 className="text-white font-black text-3xl">Gameweek {gw.number}</h1>
            <p className={`text-sm font-semibold mt-1.5 ${deadlinePassed ? 'text-red-400' : 'text-gold'}`}>
              {deadlinePassed ? '🔒 Predictions locked' : `⏱ ${timeUntil(gw.deadline_at)}`}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-4xl font-black text-white">{submitted}<span className="text-green-400 text-2xl">/{fixtures.length}</span></div>
            <div className="text-green-400 text-xs uppercase tracking-widest mt-1">Predictions entered</div>
            {submitted === fixtures.length && (
              <div className="mt-2 inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                ✓ All submitted
              </div>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-black/20">
          <div className="h-full bg-gold transition-all duration-500"
            style={{ width: `${fixtures.length ? (submitted / fixtures.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Fixtures */}
      <div className="space-y-2.5">
        {fixtures.map(fixture => {
          const pred = predictions[fixture.id]
          const sc = scores[fixture.id] ?? { h: '', a: '' }
          const isSaved = !!pred
          const isSaving = saving === fixture.id

          return (
            <div key={fixture.id}
              className={`rounded-xl border overflow-hidden transition-all ${isSaved ? 'border-green-500/40 shadow-sm shadow-green-900/20' : 'border-gray-100'} bg-white`}>

              {/* Kickoff time */}
              <div className="bg-pitch-dark px-4 py-1.5 text-center">
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">
                  {kickoffLabel(fixture.kickoff_at)}
                </span>
              </div>

              {/* Teams + inputs */}
              <div className="flex items-center px-3 py-3 gap-2">
                {/* Home */}
                <div className="flex-1 text-right pr-2">
                  <span className="font-black text-gray-900 text-sm sm:text-base leading-tight">{fixture.home_team}</span>
                  <div className="text-xs text-gray-400 mt-0.5">Home</div>
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number" min="0" max="20"
                    value={sc.h}
                    onChange={e => setScores(s => ({ ...s, [fixture.id]: { ...sc, h: e.target.value } }))}
                    onBlur={() => savePrediction(fixture.id)}
                    disabled={!isOpen || deadlinePassed}
                    className="w-11 h-11 text-center text-lg font-black rounded-lg border-2 border-pitch-light focus:outline-none focus:border-pitch-pale focus:ring-2 focus:ring-pitch-light/20 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200 transition-all"
                  />
                  <span className="text-gray-300 font-black text-lg">–</span>
                  <input
                    type="number" min="0" max="20"
                    value={sc.a}
                    onChange={e => setScores(s => ({ ...s, [fixture.id]: { ...sc, a: e.target.value } }))}
                    onBlur={() => savePrediction(fixture.id)}
                    disabled={!isOpen || deadlinePassed}
                    className="w-11 h-11 text-center text-lg font-black rounded-lg border-2 border-pitch-light focus:outline-none focus:border-pitch-pale focus:ring-2 focus:ring-pitch-light/20 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-200 transition-all"
                  />
                </div>

                {/* Away */}
                <div className="flex-1 pl-2">
                  <span className="font-black text-gray-900 text-sm sm:text-base leading-tight">{fixture.away_team}</span>
                  <div className="text-xs text-gray-400 mt-0.5">Away</div>
                </div>
              </div>

              {/* Status strip */}
              <div className={`px-4 py-1.5 text-center text-xs font-bold transition-all ${
                isSaving ? 'bg-blue-50 text-blue-500' :
                isSaved ? 'bg-green-50 text-green-600' :
                'bg-gray-50 text-gray-300'
              }`}>
                {isSaving ? '⏳ Saving...' : isSaved ? `✓ Saved — ${pred.predicted_home}–${pred.predicted_away}` : 'Enter your prediction'}
              </div>
            </div>
          )
        })}
      </div>

      {deadlinePassed && (
        <p className="text-center text-gray-400 text-sm mt-6">
          Deadline has passed — predictions are locked.
        </p>
      )}
    </div>
  )
}
