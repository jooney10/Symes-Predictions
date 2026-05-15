export interface Profile {
  id: string
  display_name: string
  is_admin: boolean
}

export interface Gameweek {
  id: number
  number: number
  deadline_at: string
  is_open: boolean
  results_processed_at: string | null
}

export interface Fixture {
  id: number
  gameweek_id: number
  home_team: string
  away_team: string
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
}

export interface Prediction {
  id: number
  user_id: string
  fixture_id: number
  gameweek_id: number
  predicted_home: number
  predicted_away: number
}

export interface PredictionResult {
  id: number
  user_id: string
  fixture_id: number
  gameweek_id: number
  correct_result: boolean
  correct_score: boolean
  points_awarded: number
}

export interface OverallStanding {
  user_id: string
  display_name: string
  gameweeks_entered: number
  correct_results: number
  correct_scores: number
  total_points: number
  avg_points_per_gw: number
  position: number
}

export interface GameweekStanding {
  user_id: string
  display_name: string
  gameweek_id: number
  predictions_submitted: number
  correct_results: number
  correct_scores: number
  points: number
}
