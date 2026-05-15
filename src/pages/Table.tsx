import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { OverallStanding } from '../lib/types'

const medal = (pos: number) => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : String(pos)

export default function Table() {
  const { profile } = useAuth()
  const [standings, setStandings] = useState<OverallStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('overall_standings').select('*')
      .then(({ data }) => { setStandings((data as OverallStanding[]) ?? []); setLoading(false) })
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="text-pitch-light animate-pulse text-lg">Loading table...</div></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏆</span>
        <h1 className="text-2xl font-black text-gray-900">League Table</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-pitch-dark grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_3.5rem_3.5rem] gap-2 px-4 py-3 text-xs font-bold text-green-300 uppercase tracking-wide">
          <div>#</div>
          <div>Player</div>
          <div className="text-center">GW</div>
          <div className="text-center">Res</div>
          <div className="text-center">Sco</div>
          <div className="text-center">Avg</div>
          <div className="text-center">Pts</div>
        </div>

        {/* Rows */}
        {standings.map((s, i) => {
          const isMe = s.user_id === profile?.id
          return (
            <div
              key={s.user_id}
              className={`grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_3.5rem_3.5rem] gap-2 px-4 py-3 items-center border-b border-gray-50 last:border-0 transition-colors ${isMe ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
            >
              <div className="text-base font-bold">{medal(s.position)}</div>
              <div className={`font-semibold truncate text-sm ${isMe ? 'text-pitch-light' : 'text-gray-900'}`}>
                {s.display_name}{isMe && <span className="text-xs text-gray-400 ml-1">(you)</span>}
              </div>
              <div className="text-center text-sm text-gray-600">{s.gameweeks_entered}</div>
              <div className="text-center text-sm text-gray-600">{s.correct_results}</div>
              <div className="text-center text-sm text-gray-600">{s.correct_scores}</div>
              <div className="text-center text-sm text-gray-500">{Number(s.avg_points_per_gw).toFixed(1)}</div>
              <div className={`text-center font-black text-lg ${isMe ? 'text-pitch-light' : 'text-gray-900'}`}>{s.total_points}</div>
            </div>
          )
        })}
      </div>

      <p className="text-center text-gray-400 text-xs mt-4">
        GW = Gameweeks entered · Res = Correct results · Sco = Exact scores · 3pts result · 5pts exact score
      </p>
    </div>
  )
}
