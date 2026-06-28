import React from 'react'

export default function About() {
  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-pitch-dark flex items-center justify-center">
          <span className="text-xl">📖</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">About & Rules</h1>
          <p className="text-sm text-gray-400">Symes' Predictions League · 2026/27</p>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
          <span>⚽</span> The Story
        </h2>
        <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
          <p>
            What started as a bit of fun between a group of about 10 of us quickly became one of those things
            you can't stop doing — even when it turned into a serious admin drain. Every week: updating the
            Google Form, manually calculating scores in a spreadsheet, screenshotting the table and chucking
            it in the group chat. You know the drill.
          </p>
          <p>
            For 2026/27, we decided enough was enough. The league has grown, the admin hadn't, and it was
            time to actually build something proper. So here we are — a custom site, live standings, automatic
            scoring, and no more spreadsheets. Welcome to the future.
          </p>
          <p className="text-gray-400 italic">
            Still the same terrible predictions though.
          </p>
        </div>
      </div>

      {/* Scoring */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
          <span>🏆</span> How Scoring Works
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="text-center shrink-0 w-16">
              <div className="text-3xl font-black text-gold">5</div>
              <div className="text-xs text-amber-600 font-bold uppercase tracking-wide">pts</div>
            </div>
            <div>
              <div className="font-black text-gray-900">Exact Score</div>
              <div className="text-sm text-gray-500 mt-0.5">You get the scoreline bang on. Arsenal 2–1 Liverpool? You said Arsenal 2–1 Liverpool. Chef's kiss.</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
            <div className="text-center shrink-0 w-16">
              <div className="text-3xl font-black text-pitch-light">3</div>
              <div className="text-xs text-green-600 font-bold uppercase tracking-wide">pts</div>
            </div>
            <div>
              <div className="font-black text-gray-900">Correct Result</div>
              <div className="text-sm text-gray-500 mt-0.5">Right winner (or draw), wrong score. You knew who'd win, just not by how much.</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-center shrink-0 w-16">
              <div className="text-3xl font-black text-gray-300">0</div>
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">pts</div>
            </div>
            <div>
              <div className="font-black text-gray-900">Wrong Result</div>
              <div className="text-sm text-gray-500 mt-0.5">Nothing. We don't talk about this.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
          <span>📋</span> The Rules
        </h2>
        <div className="space-y-4">
          {[
            {
              icon: '⏱',
              title: 'Deadline is the first whistle',
              body: 'All predictions for a gameweek must be in before the first game kicks off. Once that ball is rolling, the window is shut. No exceptions, no excuses, no "I was on the Tube."',
            },
            {
              icon: '📅',
              title: 'Predict the whole gameweek',
              body: 'You submit predictions for every fixture in the gameweek — not just the ones you fancy. That 3pm Saturday window with 8 games? Yes, all of them.',
            },
            {
              icon: '🔢',
              title: 'Scores only, no outcomes',
              body: 'Enter a predicted score for each game. The system works out the result from that. Simple.',
            },
            {
              icon: '📺',
              title: 'VAR decisions are final',
              body: 'If a goal gets chalked off after 45 minutes of checking whether a toenail was offside, tough luck — the actual scoreline stands. We do not accept complaints, appeals, or lengthy WhatsApp voice notes about it.',
            },
            {
              icon: '🏅',
              title: 'Overall winner',
              body: 'Highest total points at the end of the season wins the bragging rights. In the event of a tie, it goes to most exact scores, then most correct results, then a coin flip (we\'ll cross that bridge if we come to it).',
            },
          ].map(rule => (
            <div key={rule.title} className="flex gap-3">
              <div className="text-2xl shrink-0 mt-0.5">{rule.icon}</div>
              <div>
                <div className="font-black text-gray-900 text-sm">{rule.title}</div>
                <div className="text-sm text-gray-500 mt-0.5 leading-relaxed">{rule.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center text-gray-400 text-xs pb-4">
        Built with ☕ and mild panic · Symes' Predictions League 2026/27
      </div>
    </div>
  )
}
