export interface Competition {
  id: number;
  name: string;
  description: string;
  settings: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: number;
  competition_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: number;
  team_id: number;
  full_name: string;
  gender: string | null;
  birth_date: string | null;
  age: number;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: number;
  competition_id: number;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface StageResult {
  id: number;
  stage_id: number;
  participant_id: number;
  time_seconds: number;
  penalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface Standing {
  rank: number;
  team_id: number;
  team_name: string;
  participant_count: number;
  total_penalties: number;
  total_time: number;
  avg_age: number;
  is_incomplete_team: number;
}

export interface StageTeamResult {
  rank: number;
  stage_id: number;
  stage_name: string;
  order_index: number;
  team_id: number;
  team_name: string;
  total_penalties: number;
  total_time: number;
  avg_age: number;
}

export interface StageStanding {
  stage_id: number;
  stage_name: string;
  order_index: number;
  results: StageTeamResult[];
}

export interface ParticipantResult {
  participant_id: number;
  full_name: string;
  gender: string;
  age: number;
  penalty_points: number;
  time_seconds: number;
}

export interface TeamResultWithParticipants {
  team_id: number;
  team_name: string;
  team_total_penalties: number;
  team_total_time: number;
  participant_count: number;
  rank: number;
  participants: ParticipantResult[];
}

export interface StageStandingWithParticipants {
  stage_id: number;
  stage_name: string;
  order_index: number;
  team_results: TeamResultWithParticipants[];
}

export interface ParticipantStageDetail {
  stage_id: number;
  stage_name: string;
  order_index: number;
  participant_id: number;
  full_name: string;
  gender: string;
  age: number;
  team_name: string;
  penalty_points: number;
  time_seconds: number;
}

export interface ParticipantWithResults {
  id: number;
  team_id: number;
  full_name: string;
  gender: string;
  birth_date: string;
  age: number;
  team_name: string;
  time_seconds: number;
  penalty_points: number;
}

export interface CompetitionSettings {
  maxParticipantsPerTeam: number;
}

export interface ParticipantStageStat {
  stage_id: number;
  stage_name: string;
  order_index: number;
  penalty_points: number;
  time_seconds: number;
  stage_rank: number;
}

export interface ParticipantStatistics {
  participant_id: number;
  full_name: string;
  gender: string;
  age: number;
  birth_date: string;
  team_name: string;
  stage_results: ParticipantStageStat[];
  total_penalties: number;
  total_time: number;
  best_stage: string;
  worst_stage: string;
  avg_time: number;
  overall_rank: number;
  team_rank: number;
}

export interface TeamStageStat {
  stage_id: number;
  stage_name: string;
  order_index: number;
  total_penalties: number;
  total_time: number;
  stage_rank: number;
}

export interface TeamStatistics {
  team_id: number;
  team_name: string;
  participant_count: number;
  avg_age: number;
  total_penalties: number;
  total_time: number;
  stage_results: TeamStageStat[];
  participants: ParticipantStatistics[];
  overall_rank: number;
}
