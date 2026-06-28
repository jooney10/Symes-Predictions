import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { OverallStanding } from '../lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

const podiumStyle = [
  'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-gold',
  'bg-gradient-to-r from-gray-50 to-slate-50 border-l-4 border-gray-300',
  'bg-gradient-to-r from-orange-50 to-amber-50/50 border-l-4 border-orange-300',
]

export default function Table() {
  const { profile } = useAuth()
  const [standings, setStandings] = useState<OverallStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('overall_standings').select('*')
      .then(({ data }) => { setStandings((data as OverallStanding[]) ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="text-pitch-light text-lg animate-pulse">Loading table...</div>
    </div>
  )

  const leader = standings[0]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-pitch-dark flex items-center justify-center">
          <span className="text-xl">🏆</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">League Table</h1>
          <p className="text-sm text-gray-400">2026/27 Season</p>
        </div>
        {leader && (
          <div className="ml-auto text-right hidden sm:block">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Leading</div>
            <div className="font-black text-gray-900">{leader.display_name}</div>
            <div className="text-amber-600 font-bold text-sm">{leader.total_points} pts</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header row */}
        <div className="bg-pitch-dark px-4 py-3 grid grid-cols-[2rem_1fr_3.5rem] sm:grid-cols-[2.5rem_1fr_2.5rem_2.5rem_2.5rem_3rem_3.5rem] gap-2 text-xs font-bold text-green-300 uppercase tracking-widest">
          <div>#</div>
          <div>Player</div>
          <div className="hidden sm:block text-center">GW</div>
          <div className="hidden sm:block text-center">Res</div>
          <div className="hidden sm:block text-center">Sco</div>
          <div className="hidden sm:block text-center">Avg</div>
          <div className="text-center">Pts</div>
        </div>

        {standings.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>No standings yet — results will appear here after the first gameweek is processed.</p>
          </div>
        ) : (
          standings.map((s, i) => {
            const isMe = s.user_id === profile?.id
            const isPodium = i < 3
            const baseClass = isPodium
              ? podiumStyle[i]
              : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'

            return (
              <div
                key={s.user_id}
                className={`grid grid-cols-[2rem_1fr_3.5rem] sm:grid-cols-[2.5rem_1fr_2.5rem_2.5rem_2.5rem_3rem_3.5rem] gap-2 px-4 py-3.5 items-center border-b border-gray-100 last:border-0 transition-colors ${baseClass} ${isMe ? 'ring-inset ring-1 ring-pitch-light/30' : ''}`}
              >
                <div className="text-lg font-bold">
                  {isPodium ? MEDALS[i] : <span className="text-gray-400 text-sm">{i + 1}</span>}
                </div>
                <div>
                  <div className={`font-bold text-sm ${i === 0 ? 'text-amber-700' : isMe ? 'text-pitch-light' : 'text-gray-900'}`}>
                    {s.display_name}
                    {isMe && <span className="text-xs text-gray-400 font-normal ml-1">(you)</span>}
                  </div>
                  {/* Mobile sub-stats */}
                  <div className="sm:hidden text-xs text-gray-400 mt-0.5">
                    {s.gameweeks_entered} GW · {s.correct_results} res · {s.correct_scores} exact
                  </div>
                </div>
                <div className="hidden sm:block text-center text-sm text-gray-500">{s.gameweeks_entered}</div>
                <div className="hidden sm:block text-center text-sm text-gray-500">{s.correct_results}</div>
                <div className="hidden sm:block text-center text-sm text-gray-500">{s.correct_scores}</div>
                <div className="hidden sm:block text-center text-sm text-gray-400">{Number(s.avg_points_per_gw).toFixed(1)}</div>
                <div className={`text-center font-black text-lg ${i === 0 ? 'text-amber-600' : isMe ? 'text-pitch-light' : 'text-gray-900'}`}>
                  {s.total_points}
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="text-center text-gray-400 text-xs mt-4">
        GW = Gameweeks entered · Res = Correct results · Sco = Exact scores · 3pts result · 5pts exact
      </p>
    </div>
  )
}
