package database

import (
	"time"
)

type Competition struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Settings    string    `json:"settings"`
	CreatedAt   time.Time `json:"created_at" ts_type:"string"`
	UpdatedAt   time.Time `json:"updated_at" ts_type:"string"`
}

type Team struct {
	ID            int64     `json:"id"`
	CompetitionID int64     `json:"competition_id"`
	Name          string    `json:"name"`
	CreatedAt     time.Time `json:"created_at" ts_type:"string"`
	UpdatedAt     time.Time `json:"updated_at" ts_type:"string"`
}

type Participant struct {
	ID        int64     `json:"id"`
	TeamID    int64     `json:"team_id"`
	FullName  string    `json:"full_name"`
	Gender    *string   `json:"gender"`
	BirthDate *string   `json:"birth_date"`
	Age       int       `json:"age"`
	CreatedAt time.Time `json:"created_at" ts_type:"string"`
	UpdatedAt time.Time `json:"updated_at" ts_type:"string"`
}

type Stage struct {
	ID            int64     `json:"id"`
	CompetitionID int64     `json:"competition_id"`
	Name          string    `json:"name"`
	OrderIndex    int       `json:"order_index"`
	CreatedAt     time.Time `json:"created_at" ts_type:"string"`
	UpdatedAt     time.Time `json:"updated_at" ts_type:"string"`
}

type StageResult struct {
	ID             int64     `json:"id"`
	StageID        int64     `json:"stage_id"`
	ParticipantID  int64     `json:"participant_id"`
	TimeSeconds    float64   `json:"time_seconds"`
	PenaltyPoints  int       `json:"penalty_points"`
	CorrectAnswers int       `json:"correct_answers"`
	CreatedAt      time.Time `json:"created_at" ts_type:"string"`
	UpdatedAt      time.Time `json:"updated_at" ts_type:"string"`
}

type Standing struct {
	Rank             int     `json:"rank"`
	TeamID           int64   `json:"team_id"`
	TeamName         string  `json:"team_name"`
	ParticipantCount int     `json:"participant_count"`
	TotalPenalties   int     `json:"total_penalties"`
	TotalTime        float64 `json:"total_time"`
	AvgAge           float64 `json:"avg_age"`
	IsIncompleteTeam int     `json:"is_incomplete_team"`
}

type StageStanding struct {
	StageID    int64             `json:"stage_id"`
	StageName  string            `json:"stage_name"`
	OrderIndex int               `json:"order_index"`
	Results    []StageTeamResult `json:"results"`
}

type StageTeamResult struct {
	Rank           int     `json:"rank"`
	StageID        int64   `json:"stage_id"`
	StageName      string  `json:"stage_name"`
	OrderIndex     int     `json:"order_index"`
	TeamID         int64   `json:"team_id"`
	TeamName       string  `json:"team_name"`
	TotalPoints    int     `json:"total_points"`
	TotalPenalties int     `json:"total_penalties"`
	TotalTime      float64 `json:"total_time"`
	AvgAge         float64 `json:"avg_age"`
}

type StageStandingWithParticipants struct {
	StageID     int64                        `json:"stage_id"`
	StageName   string                       `json:"stage_name"`
	OrderIndex  int                          `json:"order_index"`
	TeamResults []TeamResultWithParticipants `json:"team_results"`
}

type TeamResultWithParticipants struct {
	TeamID             int64               `json:"team_id"`
	TeamName           string              `json:"team_name"`
	TeamTotalPoints    int                 `json:"team_total_points"`
	TeamTotalPenalties int                 `json:"team_total_penalties"`
	TeamTotalTime      float64             `json:"team_total_time"`
	ParticipantCount   int                 `json:"participant_count"`
	Rank               int                 `json:"rank"`
	Participants       []ParticipantResult `json:"participants"`
}

type ParticipantResult struct {
	ParticipantID  int64   `json:"participant_id"`
	FullName       string  `json:"full_name"`
	Gender         string  `json:"gender"`
	Age            int     `json:"age"`
	PenaltyPoints  int     `json:"penalty_points"`
	CorrectAnswers int     `json:"correct_answers"`
	Points         int     `json:"points"`
	TimeSeconds    float64 `json:"time_seconds"`
}

type ParticipantStageDetail struct {
	StageID        int64   `json:"stage_id"`
	StageName      string  `json:"stage_name"`
	OrderIndex     int     `json:"order_index"`
	ParticipantID  int64   `json:"participant_id"`
	FullName       string  `json:"full_name"`
	Gender         string  `json:"gender"`
	Age            int     `json:"age"`
	TeamName       string  `json:"team_name"`
	PenaltyPoints  int     `json:"penalty_points"`
	CorrectAnswers int     `json:"correct_answers"`
	Points         int     `json:"points"`
	TimeSeconds    float64 `json:"time_seconds"`
}

type CompetitionSettings struct {
	MaxParticipantsPerTeam int `json:"maxParticipantsPerTeam"`
}

type ParticipantWithResults struct {
	ID             int64   `json:"id"`
	TeamID         int64   `json:"team_id"`
	FullName       string  `json:"full_name"`
	Gender         string  `json:"gender"`
	BirthDate      string  `json:"birth_date"`
	Age            int     `json:"age"`
	TeamName       string  `json:"team_name"`
	TimeSeconds    float64 `json:"time_seconds"`
	PenaltyPoints  int     `json:"penalty_points"`
	CorrectAnswers int     `json:"correct_answers"`
}

type AllCompetitionStanding struct {
	Rank              int     `json:"overall_rank"`
	TeamName          string  `json:"team_name"`
	CompetitionName   string  `json:"competition_name"`
	RankInCompetition int     `json:"rank"`
	TotalPenalties    int     `json:"total_penalties"`
	TotalTime         float64 `json:"total_time"`
}

type IndividualStanding struct {
	StageID   int64              `json:"stage_id"`
	StageName string             `json:"stage_name"`
	Boys      []IndividualResult `json:"boys"`
	Girls     []IndividualResult `json:"girls"`
}

type IndividualResult struct {
	ParticipantID  int64   `json:"participant_id"`
	FullName       string  `json:"full_name"`
	TeamName       string  `json:"team_name"`
	Gender         string  `json:"gender"`
	Age            int     `json:"age"`
	BirthDate      string  `json:"birth_date"`
	CorrectAnswers int     `json:"correct_answers"`
	PenaltyPoints  int     `json:"penalty_points"`
	Points         int     `json:"points"`
	TimeSeconds    float64 `json:"time_seconds"`
	Rank           int     `json:"rank"`
}

type OverallStanding struct {
	Rank             int    `json:"rank"`
	TeamID           int64  `json:"team_id"`
	TeamName         string `json:"team_name"`
	TotalPlacePoints int    `json:"total_place_points"`
	FirstPlaces      int    `json:"first_places"`
	SecondPlaces     int    `json:"second_places"`
	ThirdPlaces      int    `json:"third_places"`
}
