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
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">📊</span>
        <h1 className="text-2xl font-black text-gray-900">Results</h1>
      </div>

      {/* GW Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {gameweeks.map(gw => (
          <button
            key={gw.id}
            onClick={() => setSelectedGw(gw)}
            className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${selectedGw?.id === gw.id ? 'bg-pitch-light text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-pitch-light'}`}
          >
            GW{gw.number}
            {gw.results_processed_at && <span className="ml-1 text-gold">•</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="text-pitch-light animate-pulse">Loading...</div></div>
      ) : !isProcessed ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-amber-800 font-semibold">Results for GW{selectedGw?.number} haven't been processed yet.</p>
          <p className="text-amber-600 text-sm mt-1">Check back after the matches have been played.</p>
        </div>
      ) : (
        <>
          {/* My GW Summary */}
          {myResult && (
            <div className="bg-pitch-light rounded-2xl p-5 mb-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-black text-white">{myResult.points}</div>
                <div className="text-green-200 text-xs uppercase tracking-wide mt-1">Points</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white">{myResult.correct_results}</div>
                <div className="text-green-200 text-xs uppercase tracking-wide mt-1">Results</div>
              </div>
              <div>
                <div className="text-3xl font-black text-gold">{myResult.correct_scores}</div>
                <div className="text-green-200 text-xs uppercase tracking-wide mt-1">Exact Scores</div>
              </div>
            </div>
          )}

          {/* Fixture Results */}
          <div className="space-y-3 mb-6">
            {fixtures.map(f => {
              const pred = predictions[f.id]
              const res = results[f.id]
              const bg = !res ? 'border-gray-100' : res.correct_score ? 'border-green-300 bg-green-50' : res.correct_result ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
              return (
                <div key={f.id} className={`bg-white rounded-2xl border-2 ${bg} p-4`}>
                  <div className="text-center text-xs text-gray-400 uppercase mb-2">{kickoffLabel(f.kickoff_at)}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 text-right font-bold text-gray-900 text-sm">{f.home_team}</span>
                    <div className="text-center shrink-0 min-w-[120px]">
                      <div className="text-2xl font-black text-gray-900">{f.home_score} - {f.away_score}</div>
                      {pred ? (
                        <div className="text-xs text-gray-500 mt-0.5">Your pick: {pred.predicted_home}-{pred.predicted_away}</div>
                      ) : (
                        <div className="text-xs text-red-400 mt-0.5">No pick</div>
                      )}
                    </div>
                    <span className="flex-1 text-left font-bold text-gray-900 text-sm">{f.away_team}</span>
                  </div>
                  {res && (
                    <div className="text-center mt-2">
                      {res.correct_score && <span className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">⭐ Exact score! +5pts</span>}
                      {!res.correct_score && res.correct_result && <span className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">✓ Correct result +3pts</span>}
                      {!res.correct_result && <span className="inline-block bg-gray-300 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">No points</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* GW Mini Table */}
          {gwStandings.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-pitch-dark px-4 py-3 text-white font-bold text-sm">GW{selectedGw?.number} Standings</div>
              {gwStandings.map((s: any, i: number) => (
                <div key={s.user_id} className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 ${s.user_id === profile?.id ? 'bg-green-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-5">{i + 1}</span>
                    <span className={`font-semibold text-sm ${s.user_id === profile?.id ? 'text-pitch-light' : 'text-gray-900'}`}>{s.profiles?.display_name ?? 'Unknown'}</span>
                  </div>
                  <span className="font-black text-lg text-gray-900">{s.points}pts</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
