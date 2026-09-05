package database

import (
	"time"
)

type Competition struct {
	ID          int64     `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	Settings    string    `json:"settings" db:"settings"`
	CreatedAt   time.Time `json:"created_at" ts_type:"string" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" ts_type:"string" db:"updated_at"`
}

type Team struct {
	ID               int64     `json:"id" db:"id"`
	CompetitionID    int64     `json:"competition_id" db:"competition_id"`
	Name             string    `json:"name" db:"name"`
	CreatedAt        time.Time `json:"created_at" ts_type:"string" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" ts_type:"string" db:"updated_at"`
	ParticipantCount int       `json:"participant_count" db:"participant_count"`
}

type Participant struct {
	ID        int64     `json:"id" db:"id"`
	TeamID    int64     `json:"team_id" db:"team_id"`
	FullName  string    `json:"full_name" db:"full_name"`
	Gender    *string   `json:"gender" db:"gender"`
	BirthDate *string   `json:"birth_date" db:"birth_date"`
	Age       int       `json:"age" db:"age"`
	CreatedAt time.Time `json:"created_at" ts_type:"string" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" ts_type:"string" db:"updated_at"`
}

type Stage struct {
	ID            int64     `json:"id" db:"id"`
	CompetitionID int64     `json:"competition_id" db:"competition_id"`
	Name          string    `json:"name" db:"name"`
	OrderIndex    int       `json:"order_index" db:"order_index"`
	CreatedAt     time.Time `json:"created_at" ts_type:"string" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" ts_type:"string" db:"updated_at"`
}

type StageResult struct {
	ID             int64     `json:"id" db:"id"`
	StageID        int64     `json:"stage_id" db:"stage_id"`
	ParticipantID  int64     `json:"participant_id" db:"participant_id"`
	TimeSeconds    float64   `json:"time_seconds" db:"time_seconds"`
	PenaltyPoints  int       `json:"penalty_points" db:"penalty_points"`
	CorrectAnswers int       `json:"correct_answers" db:"correct_answers"`
	CreatedAt      time.Time `json:"created_at" ts_type:"string" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" ts_type:"string" db:"updated_at"`
}

type Standing struct {
	Rank             int     `json:"rank" db:"rank"`
	TeamID           int64   `json:"team_id" db:"team_id"`
	TeamName         string  `json:"team_name" db:"team_name"`
	ParticipantCount int     `json:"participant_count" db:"participant_count"`
	TotalPenalties   int     `json:"total_penalties" db:"total_penalties"`
	TotalTime        float64 `json:"total_time" db:"total_time"`
	AvgAge           float64 `json:"avg_age" db:"avg_age"`
	IsIncompleteTeam int     `json:"is_incomplete_team" db:"is_incomplete_team"`
}

type StageStanding struct {
	StageID    int64             `json:"stage_id" db:"stage_id"`
	StageName  string            `json:"stage_name" db:"stage_name"`
	OrderIndex int               `json:"order_index" db:"order_index"`
	Results    []StageTeamResult `json:"results" db:"-"`
}

type StageTeamResult struct {
	Rank           int     `json:"rank" db:"rank"`
	StageID        int64   `json:"stage_id" db:"stage_id"`
	StageName      string  `json:"stage_name" db:"stage_name"`
	OrderIndex     int     `json:"order_index" db:"order_index"`
	TeamID         int64   `json:"team_id" db:"team_id"`
	TeamName       string  `json:"team_name" db:"team_name"`
	TotalPoints    int     `json:"total_points" db:"total_points"`
	TotalPenalties int     `json:"total_penalties" db:"total_penalties"`
	TotalTime      float64 `json:"total_time" db:"total_time"`
	AvgAge         float64 `json:"avg_age" db:"avg_age"`
}

type StageStandingWithParticipants struct {
	StageID     int64                        `json:"stage_id" db:"stage_id"`
	StageName   string                       `json:"stage_name" db:"stage_name"`
	OrderIndex  int                          `json:"order_index" db:"order_index"`
	TeamResults []TeamResultWithParticipants `json:"team_results" db:"-"`
}

type TeamResultWithParticipants struct {
	TeamID             int64               `json:"team_id" db:"team_id"`
	TeamName           string              `json:"team_name" db:"team_name"`
	TeamTotalPoints    int                 `json:"team_total_points" db:"team_total_points"`
	TeamTotalPenalties int                 `json:"team_total_penalties" db:"team_total_penalties"`
	TeamTotalTime      float64             `json:"team_total_time" db:"team_total_time"`
	ParticipantCount   int                 `json:"participant_count" db:"participant_count"`
	Rank               int                 `json:"rank" db:"rank"`
	Participants       []ParticipantResult `json:"participants" db:"-"`
}

type ParticipantResult struct {
	ParticipantID  int64   `json:"participant_id" db:"participant_id"`
	FullName       string  `json:"full_name" db:"full_name"`
	Gender         string  `json:"gender" db:"gender"`
	Age            int     `json:"age" db:"age"`
	PenaltyPoints  int     `json:"penalty_points" db:"penalty_points"`
	CorrectAnswers int     `json:"correct_answers" db:"correct_answers"`
	Points         int     `json:"points" db:"points"`
	TimeSeconds    float64 `json:"time_seconds" db:"time_seconds"`
}

type ParticipantStageDetail struct {
	StageID        int64   `json:"stage_id" db:"stage_id"`
	StageName      string  `json:"stage_name" db:"stage_name"`
	OrderIndex     int     `json:"order_index" db:"order_index"`
	ParticipantID  int64   `json:"participant_id" db:"participant_id"`
	FullName       string  `json:"full_name" db:"full_name"`
	Gender         string  `json:"gender" db:"gender"`
	Age            int     `json:"age" db:"age"`
	TeamName       string  `json:"team_name" db:"team_name"`
	PenaltyPoints  int     `json:"penalty_points" db:"penalty_points"`
	CorrectAnswers int     `json:"correct_answers" db:"correct_answers"`
	Points         int     `json:"points" db:"points"`
	TimeSeconds    float64 `json:"time_seconds" db:"time_seconds"`
}

type CompetitionSettings struct {
	MaxParticipantsPerTeam int `json:"maxParticipantsPerTeam"`
}

type ParticipantWithResults struct {
	ID             int64   `json:"id" db:"id"`
	TeamID         int64   `json:"team_id" db:"team_id"`
	FullName       string  `json:"full_name" db:"full_name"`
	Gender         string  `json:"gender" db:"gender"`
	BirthDate      string  `json:"birth_date" db:"birth_date"`
	Age            int     `json:"age" db:"age"`
	TeamName       string  `json:"team_name" db:"team_name"`
	TimeSeconds    float64 `json:"time_seconds" db:"time_seconds"`
	PenaltyPoints  int     `json:"penalty_points" db:"penalty_points"`
	CorrectAnswers int     `json:"correct_answers" db:"correct_answers"`
}

type AllCompetitionStanding struct {
	Rank              int     `json:"overall_rank" db:"rank"`
	TeamName          string  `json:"team_name" db:"team_name"`
	CompetitionName   string  `json:"competition_name" db:"competition_name"`
	RankInCompetition int     `json:"rank" db:"rank_in_competition"`
	TotalPenalties    int     `json:"total_penalties" db:"total_penalties"`
	TotalTime         float64 `json:"total_time" db:"total_time"`
}

type IndividualStanding struct {
	StageID   int64              `json:"stage_id" db:"stage_id"`
	StageName string             `json:"stage_name" db:"stage_name"`
	Boys      []IndividualResult `json:"boys" db:"-"`
	Girls     []IndividualResult `json:"girls" db:"-"`
}

type IndividualResult struct {
	ParticipantID  int64   `json:"participant_id" db:"participant_id"`
	FullName       string  `json:"full_name" db:"full_name"`
	TeamName       string  `json:"team_name" db:"team_name"`
	Gender         string  `json:"gender" db:"gender"`
	Age            int     `json:"age" db:"age"`
	BirthDate      string  `json:"birth_date" db:"birth_date"`
	CorrectAnswers int     `json:"correct_answers" db:"correct_answers"`
	PenaltyPoints  int     `json:"penalty_points" db:"penalty_points"`
	Points         int     `json:"points" db:"points"`
	TimeSeconds    float64 `json:"time_seconds" db:"time_seconds"`
	Rank           int     `json:"rank" db:"rank"`
}

type OverallStanding struct {
	Rank             int    `json:"rank" db:"rank"`
	TeamID           int64  `json:"team_id" db:"team_id"`
	TeamName         string `json:"team_name" db:"team_name"`
	TotalPlacePoints int    `json:"total_place_points" db:"total_place_points"`
	FirstPlaces      int    `json:"first_places" db:"first_places"`
	SecondPlaces     int    `json:"second_places" db:"second_places"`
	ThirdPlaces      int    `json:"third_places" db:"third_places"`
}
