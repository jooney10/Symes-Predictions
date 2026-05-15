import React, { useEffect, useState, useCallback } from 'react'
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
        .from('fixtures').select('*').eq('gameweek_id', gameweek.id)
        .order('kickoff_at')
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

  if (loading) return <Loading />

  if (!gw) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">No fixtures yet</h2>
      <p className="text-gray-500">Fixtures load every Saturday at 3pm. Check back soon!</p>
    </div>
  )

  const submitted = Object.keys(predictions).length
  const isOpen = gw.is_open

  return (
    <div>
      {/* GW Header */}
      <div className="bg-pitch-dark rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-2xl">Gameweek {gw.number}</h1>
          <p className={`text-sm font-semibold mt-1 ${isOpen ? 'text-gold' : 'text-gray-400'}`}>
            {isOpen ? `⏱ ${timeUntil(gw.deadline_at)}` : '🔒 Predictions locked'}
          </p>
        </div>
        <div className="bg-white/10 rounded-xl px-5 py-3 text-center">
          <div className="text-white font-black text-2xl">{submitted}<span className="text-green-400">/{fixtures.length}</span></div>
          <div className="text-green-300 text-xs uppercase tracking-wide">Predictions entered</div>
        </div>
      </div>

      {/* Fixtures */}
      <div className="space-y-3">
        {fixtures.map(fixture => {
          const pred = predictions[fixture.id]
          const sc = scores[fixture.id] ?? { h: '', a: '' }
          const isSaved = !!pred
          const isSaving = saving === fixture.id

          return (
            <div key={fixture.id} className={`bg-white rounded-2xl shadow-sm border-2 transition-colors ${isSaved ? 'border-green-200' : 'border-gray-100'}`}>
              <div className="px-4 pt-3 pb-1 text-center text-xs text-gray-400 uppercase tracking-wide font-medium">
                {kickoffLabel(fixture.kickoff_at)}
              </div>
              <div className="px-4 pb-4 flex items-center justify-between gap-3">
                {/* Home team */}
                <div className="flex-1 text-right">
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{fixture.home_team}</span>
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number" min="0" max="20"
                    value={sc.h}
                    onChange={e => setScores(s => ({ ...s, [fixture.id]: { ...sc, h: e.target.value } }))}
                    onBlur={() => savePrediction(fixture.id)}
                    disabled={!isOpen}
                    className="w-12 h-12 text-center text-xl font-black border-2 border-pitch-light rounded-xl focus:outline-none focus:border-pitch-pale disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                    placeholder="0"
                  />
                  <span className="text-2xl font-black text-gray-400">-</span>
                  <input
                    type="number" min="0" max="20"
                    value={sc.a}
                    onChange={e => setScores(s => ({ ...s, [fixture.id]: { ...sc, a: e.target.value } }))}
                    onBlur={() => savePrediction(fixture.id)}
                    disabled={!isOpen}
                    className="w-12 h-12 text-center text-xl font-black border-2 border-pitch-light rounded-xl focus:outline-none focus:border-pitch-pale disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                    placeholder="0"
                  />
                </div>

                {/* Away team */}
                <div className="flex-1 text-left">
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{fixture.away_team}</span>
                </div>
              </div>

              {/* Saved indicator */}
              <div className={`px-4 pb-3 text-center text-xs font-semibold transition-all ${isSaving ? 'text-blue-400' : isSaved ? 'text-green-500' : 'text-transparent'}`}>
                {isSaving ? 'Saving...' : isSaved ? '✓ Saved' : '.'}
              </div>
            </div>
          )
        })}
      </div>

      {!isOpen && (
        <p className="text-center text-gray-400 text-sm mt-6">
          The deadline has passed — predictions are now locked.
        </p>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-20">
      <div className="text-pitch-light text-lg animate-pulse">Loading fixtures...</div>
    </div>
  )
}
