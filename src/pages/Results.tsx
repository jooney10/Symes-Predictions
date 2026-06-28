import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { Gameweek, Fixture, Prediction, PredictionResult } from '../lib/types'

function kickoffLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export default function Results() {
  const { profile } = useAuth()
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([])
  const [selectedGw, setSelectedGw] = useState<Gameweek | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [results, setResults] = useState<Record<number, PredictionResult>>({})
  const [gwStandings, setGwStandings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('gameweeks').select('*').order('number', { ascending: false })
      .then(({ data }) => {
        const gws = data ?? []
        setGameweeks(gws)
        const processed = gws.find((g: Gameweek) => g.results_processed_at)
        setSelectedGw(processed ?? gws[0] ?? null)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedGw || !profile) return
    async function load() {
      setLoading(true)
      const [fxRes, predRes, resRes, standRes] = await Promise.all([
        supabase.from('fixtures').select('*').eq('gameweek_id', selectedGw!.id).order('kickoff_at'),
        supabase.from('predictions').select('*').eq('gameweek_id', selectedGw!.id).eq('user_id', profile!.id),
        supabase.from('prediction_results').select('*').eq('gameweek_id', selectedGw!.id).eq('user_id', profile!.id),
        supabase.from('gameweek_standings').select('*, profiles(display_name)').eq('gameweek_id', selectedGw!.id).order('points', { ascending: false }),
      ])
      setFixtures(fxRes.data ?? [])
      const pm: Record<number, Prediction> = {}; for (const p of predRes.data ?? []) pm[p.fixture_id] = p
      setPredictions(pm)
      const rm: Record<number, PredictionResult> = {}; for (const r of resRes.data ?? []) rm[r.fixture_id] = r
      setResults(rm)
      setGwStandings(standRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [selectedGw?.id, profile?.id])

  const myResult = gwStandings.find((s: any) => s.user_id === profile?.id)
  const isProcessed = selectedGw?.results_processed_at != null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-pitch-dark flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Results</h1>
          <p className="text-sm text-gray-400">2026/27 Season</p>
        </div>
      </div>

      {/* GW Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {gameweeks.map(gw => (
          <button
            key={gw.id}
            onClick={() => setSelectedGw(gw)}
            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all ${selectedGw?.id === gw.id ? 'bg-pitch-dark text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-pitch-light hover:text-pitch-light'}`}
          >
            GW{gw.number}
            {gw.results_processed_at && <span className="ml-1.5 text-gold">✓</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="text-pitch-light animate-pulse">Loading...</div></div>
      ) : !isProcessed ? (
        <div className="border border-amber-200 rounded-2xl p-8 text-center bg-amber-50">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-amber-800 font-bold text-lg">Results pending</p>
          <p className="text-amber-600 text-sm mt-1">GW{selectedGw?.number} hasn't been processed yet. Check back after the matches.</p>
        </div>
      ) : (
        <>
          {/* My GW Summary */}
          {myResult && (
            <div className="rounded-2xl mb-5 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0f2d0a 0%, #1a4a10 100%)' }}>
              <div className="p-5 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-4xl font-black text-white">{myResult.points}</div>
                  <div className="text-green-400 text-xs uppercase tracking-widest mt-1">Points</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-white">{myResult.correct_results}</div>
                  <div className="text-green-400 text-xs uppercase tracking-widest mt-1">Correct</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-gold">{myResult.correct_scores}</div>
                  <div className="text-green-400 text-xs uppercase tracking-widest mt-1">Exact</div>
                </div>
              </div>
            </div>
          )}

          {/* Fixture Results */}
          <div className="space-y-2.5 mb-6">
            {fixtures.map(f => {
              const pred = predictions[f.id]
              const res = results[f.id]
              const isExact = res?.correct_score
              const isCorrect = res?.correct_result && !isExact
              const noPoints = res && !res.correct_result

              return (
                <div key={f.id} className={`rounded-xl border-2 overflow-hidden ${
                  isExact ? 'border-green-400' :
                  isCorrect ? 'border-amber-400' :
                  noPoints ? 'border-gray-200' :
                  'border-gray-100'
                } bg-white`}>
                  <div className="bg-pitch-dark px-4 py-1.5 text-center">
                    <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">{kickoffLabel(f.kickoff_at)}</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-right font-black text-gray-900">{f.home_team}</span>
                      <div className="text-center shrink-0 min-w-[100px]">
                        <div className="text-3xl font-black text-gray-900 leading-none">{f.home_score}–{f.away_score}</div>
                        {pred ? (
                          <div className="text-xs text-gray-400 mt-1">Your pick: {pred.predicted_home}–{pred.predicted_away}</div>
                        ) : (
                          <div className="text-xs text-red-400 mt-1">No pick</div>
                        )}
                      </div>
                      <span className="flex-1 text-left font-black text-gray-900">{f.away_team}</span>
                    </div>
                    {res && (
                      <div className="text-center mt-2.5">
                        {isExact && <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-black px-3 py-1.5 rounded-full">⭐ Exact score! +5pts</span>}
                        {isCorrect && <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-black px-3 py-1.5 rounded-full">✓ Correct result +3pts</span>}
                        {noPoints && <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full">No points</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* GW Mini Table */}
          {gwStandings.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-pitch-dark px-4 py-3 text-white font-black text-sm tracking-wide">GW{selectedGw?.number} Standings</div>
              {gwStandings.map((s: any, i: number) => (
                <div key={s.user_id} className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 ${s.user_id === profile?.id ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-5 font-bold">{i + 1}</span>
                    <span className={`font-bold text-sm ${s.user_id === profile?.id ? 'text-pitch-light' : 'text-gray-900'}`}>
                      {s.profiles?.display_name ?? 'Unknown'}
                      {s.user_id === profile?.id && <span className="text-gray-400 font-normal ml-1 text-xs">(you)</span>}
                    </span>
                  </div>
                  <span className="font-black text-lg text-gray-900">{s.points}<span className="text-gray-400 text-sm font-normal">pts</span></span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
