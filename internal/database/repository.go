package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

const defaultMaxParticipantsPerTeam = 4

type Repository struct {
	db *DB
}

func NewRepository(db *DB) *Repository {
	return &Repository{db: db}
}

// ===== Competitions =====

func (r *Repository) ListCompetitions() ([]Competition, error) {
	var comps []Competition
	if err := r.db.Select(&comps, "SELECT id, name, description, settings, created_at, updated_at FROM competitions ORDER BY created_at DESC"); err != nil {
		slog.Error("ListCompetitions", "error", err)
		return nil, err
	}
	return comps, nil
}

func (r *Repository) GetCompetitionByID(id int64) (*Competition, error) {
	var c Competition
	err := r.db.Get(&c, "SELECT id, name, description, settings, created_at, updated_at FROM competitions WHERE id = ?", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		slog.Error("GetCompetitionByID", "id", id, "error", err)
		return nil, err
	}
	return &c, nil
}

func (r *Repository) CreateCompetition(data Competition) (*Competition, error) {
	settings := data.Settings
	if settings == "" {
		settings = `{"maxParticipantsPerTeam":4}`
	}
	res, err := r.db.Exec("INSERT INTO competitions (name, description, settings, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", strings.TrimSpace(data.Name), strings.TrimSpace(data.Description), settings)
	if err != nil {
		slog.Error("CreateCompetition", "name", data.Name, "error", err)
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetCompetitionByID(id)
}

func (r *Repository) UpdateCompetition(id int64, data Competition) (*Competition, error) {
	settings := data.Settings
	if settings == "" {
		settings = `{"maxParticipantsPerTeam":4}`
	}
	_, err := r.db.Exec("UPDATE competitions SET name = ?, description = ?, settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", strings.TrimSpace(data.Name), strings.TrimSpace(data.Description), settings, id)
	if err != nil {
		slog.Error("UpdateCompetition", "id", id, "error", err)
		return nil, err
	}
	return r.GetCompetitionByID(id)
}

func (r *Repository) DeleteCompetition(id int64) error {
	_, err := r.db.Exec("DELETE FROM competitions WHERE id = ?", id)
	if err != nil {
		slog.Error("DeleteCompetition", "id", id, "error", err)
		return err
	}
	return nil
}

// ===== Teams =====

func (r *Repository) ListTeams(competitionID int64) ([]Team, error) {
	var teams []Team
	if err := r.db.Select(&teams, "SELECT t.id, t.competition_id, t.name, t.created_at, t.updated_at, COALESCE(pc.participant_count, 0) AS participant_count FROM teams t LEFT JOIN (SELECT team_id, COUNT(*) AS participant_count FROM participants GROUP BY team_id) pc ON pc.team_id = t.id WHERE t.competition_id = ? ORDER BY t.name ASC", competitionID); err != nil {
		slog.Error("ListTeams", "error", err)
		return nil, err
	}
	return teams, nil
}

func (r *Repository) GetTeamByID(id int64) (*Team, error) {
	var t Team
	err := r.db.Get(&t, "SELECT id, competition_id, name, created_at, updated_at FROM teams WHERE id = ?", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		slog.Error("GetTeamByID", "id", id, "error", err)
		return nil, err
	}
	return &t, nil
}

func (r *Repository) CreateTeam(competitionID int64, name string) (*Team, error) {
	res, err := r.db.Exec("INSERT INTO teams (competition_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", competitionID, strings.TrimSpace(name))
	if err != nil {
		slog.Error("CreateTeam", "name", name, "error", err)
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetTeamByID(id)
}

func (r *Repository) UpdateTeam(id int64, name string) (*Team, error) {
	_, err := r.db.Exec("UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", strings.TrimSpace(name), id)
	if err != nil {
		slog.Error("UpdateTeam", "id", id, "error", err)
		return nil, err
	}
	return r.GetTeamByID(id)
}

func (r *Repository) DeleteTeam(id int64) error {
	_, err := r.db.Exec("DELETE FROM teams WHERE id = ?", id)
	if err != nil {
		slog.Error("DeleteTeam", "id", id, "error", err)
		return err
	}
	return nil
}

// ===== Participants =====

func (r *Repository) ListParticipants(teamID int64) ([]Participant, error) {
	var participants []Participant
	if err := r.db.Select(&participants, "SELECT id, team_id, full_name, gender, birth_date, age, created_at, updated_at FROM participants WHERE team_id = ? ORDER BY id ASC", teamID); err != nil {
		slog.Error("ListParticipants", "teamID", teamID, "error", err)
		return nil, err
	}
	return participants, nil
}

func (r *Repository) GetParticipantByID(id int64) (*Participant, error) {
	var p Participant
	err := r.db.Get(&p, "SELECT id, team_id, full_name, gender, birth_date, age, created_at, updated_at FROM participants WHERE id = ?", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		slog.Error("GetParticipantByID", "id", id, "error", err)
		return nil, err
	}
	return &p, nil
}

func (r *Repository) CreateParticipant(teamID int64, p Participant) (*Participant, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		slog.Error("CreateParticipant begin tx", "teamID", teamID, "error", err)
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var competitionID int64
	if err := tx.Get(&competitionID, "SELECT competition_id FROM teams WHERE id = ?", teamID); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("команда не найдена")
		}
		slog.Error("CreateParticipant get competition", "teamID", teamID, "error", err)
		return nil, err
	}

	maxParticipants, err := r.maxParticipantsForCompetitionTx(tx, competitionID)
	if err != nil {
		return nil, err
	}

	var count int
	if err := tx.Get(&count, "SELECT COUNT(1) FROM participants WHERE team_id = ?", teamID); err != nil {
		slog.Error("failed to count participants", "teamID", teamID, "error", err)
		return nil, err
	}
	if count >= maxParticipants {
		return nil, fmt.Errorf("в команде не может быть больше %d участников", maxParticipants)
	}

	age := p.Age
	if p.BirthDate != nil && age == 0 {
		age = calcAge(*p.BirthDate)
	}

	res, err := tx.Exec(
		"INSERT INTO participants (team_id, full_name, gender, birth_date, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
		teamID, strings.TrimSpace(p.FullName), p.Gender, p.BirthDate, age,
	)
	if err != nil {
		slog.Error("CreateParticipant", "teamID", teamID, "name", p.FullName, "error", err)
		return nil, err
	}
	id, _ := res.LastInsertId()
	if err := tx.Commit(); err != nil {
		slog.Error("CreateParticipant commit", "teamID", teamID, "error", err)
		return nil, err
	}

	return r.GetParticipantByID(id)
}

func (r *Repository) UpdateParticipant(id int64, p Participant) (*Participant, error) {
	age := p.Age
	if p.BirthDate != nil && age == 0 {
		age = calcAge(*p.BirthDate)
	}
	_, err := r.db.Exec(
		"UPDATE participants SET full_name = ?, gender = ?, birth_date = ?, age = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		strings.TrimSpace(p.FullName), p.Gender, p.BirthDate, age, id,
	)
	if err != nil {
		slog.Error("UpdateParticipant", "id", id, "error", err)
		return nil, err
	}
	return r.GetParticipantByID(id)
}

func (r *Repository) maxParticipantsForCompetitionTx(tx *sqlx.Tx, competitionID int64) (int, error) {
	var settingsJSON string
	if err := tx.Get(&settingsJSON, "SELECT settings FROM competitions WHERE id = ?", competitionID); err != nil {
		if err == sql.ErrNoRows {
			return defaultMaxParticipantsPerTeam, nil
		}
		slog.Error("maxParticipantsForCompetition", "competitionID", competitionID, "error", err)
		return 0, err
	}
	if settingsJSON == "" {
		return defaultMaxParticipantsPerTeam, nil
	}
	var settings CompetitionSettings
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return defaultMaxParticipantsPerTeam, nil
	}
	if settings.MaxParticipantsPerTeam <= 0 {
		return defaultMaxParticipantsPerTeam, nil
	}
	return settings.MaxParticipantsPerTeam, nil
}

func (r *Repository) DeleteParticipant(id int64) error {
	_, err := r.db.Exec("DELETE FROM participants WHERE id = ?", id)
	if err != nil {
		slog.Error("DeleteParticipant", "id", id, "error", err)
		return err
	}
	return nil
}

// ===== Stages =====

func (r *Repository) ListStages(competitionID int64) ([]Stage, error) {
	var stages []Stage
	if err := r.db.Select(&stages, "SELECT id, competition_id, name, order_index, created_at, updated_at FROM stages WHERE competition_id = ? ORDER BY id ASC", competitionID); err != nil {
		slog.Error("ListStages", "error", err)
		return nil, err
	}
	return stages, nil
}

func (r *Repository) GetStageByID(id int64) (*Stage, error) {
	var s Stage
	err := r.db.Get(&s, "SELECT id, competition_id, name, order_index, created_at, updated_at FROM stages WHERE id = ?", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		slog.Error("GetStageByID", "id", id, "error", err)
		return nil, err
	}
	return &s, nil
}

func (r *Repository) CreateStage(competitionID int64, name string) (*Stage, error) {
	res, err := r.db.Exec("INSERT INTO stages (competition_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", competitionID, strings.TrimSpace(name))
	if err != nil {
		slog.Error("CreateStage", "name", name, "error", err)
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetStageByID(id)
}

func (r *Repository) UpdateStage(id int64, name string) (*Stage, error) {
	_, err := r.db.Exec("UPDATE stages SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", strings.TrimSpace(name), id)
	if err != nil {
		slog.Error("UpdateStage", "id", id, "error", err)
		return nil, err
	}
	return r.GetStageByID(id)
}

func (r *Repository) DeleteStage(id int64) error {
	_, err := r.db.Exec("DELETE FROM stages WHERE id = ?", id)
	if err != nil {
		slog.Error("DeleteStage", "id", id, "error", err)
		return err
	}
	return nil
}

// ===== Results =====

func (r *Repository) UpsertStageResult(stageID, participantID int64, timeSeconds float64, penaltyPoints int) (*StageResult, error) {
	var existingID int64
	err := r.db.Get(&existingID, "SELECT id FROM stage_results WHERE stage_id = ? AND participant_id = ?", stageID, participantID)
	switch err {
	case nil:
		_, err = r.db.Exec("UPDATE stage_results SET time_seconds = ?, penalty_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", timeSeconds, penaltyPoints, existingID)
		if err != nil {
			slog.Error("UpsertStageResult update", "stageID", stageID, "participantID", participantID, "error", err)
			return nil, err
		}
	case sql.ErrNoRows:
		res, err := r.db.Exec("INSERT INTO stage_results (stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", stageID, participantID, timeSeconds, penaltyPoints)
		if err != nil {
			slog.Error("UpsertStageResult insert", "stageID", stageID, "participantID", participantID, "error", err)
			return nil, err
		}
		existingID, _ = res.LastInsertId()
	default:
		slog.Error("UpsertStageResult lookup", "stageID", stageID, "participantID", participantID, "error", err)
		return nil, err
	}

	var sr StageResult
	if err := r.db.Get(&sr, "SELECT id, stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at FROM stage_results WHERE id = ?", existingID); err != nil {
		slog.Error("UpsertStageResult refetch", "id", existingID, "error", err)
		return nil, err
	}
	return &sr, nil
}

func (r *Repository) GetStageResults(stageID int64) ([]StageResult, error) {
	var results []StageResult
	if err := r.db.Select(&results, "SELECT id, stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at FROM stage_results WHERE stage_id = ?", stageID); err != nil {
		slog.Error("GetStageResults", "stageID", stageID, "error", err)
		return nil, err
	}
	return results, nil
}

func (r *Repository) ListStageResultsForCompetition(competitionID int64) ([]StageResult, error) {
	var results []StageResult
	if err := r.db.Select(&results, "SELECT sr.id, sr.stage_id, sr.participant_id, sr.time_seconds, sr.penalty_points, sr.created_at, sr.updated_at FROM stage_results sr JOIN stages s ON s.id = sr.stage_id WHERE s.competition_id = ?", competitionID); err != nil {
		slog.Error("ListStageResultsForCompetition", "competitionID", competitionID, "error", err)
		return nil, err
	}
	return results, nil
}

func (r *Repository) CompetitionNameExists(name string) (bool, error) {
	var count int
	if err := r.db.Get(&count, "SELECT COUNT(1) FROM competitions WHERE name = ?", name); err != nil {
		slog.Error("CompetitionNameExists", "name", name, "error", err)
		return false, err
	}
	return count > 0, nil
}

// ===== Standings =====

func (r *Repository) ComputeStandings(competitionID int64) ([]OverallStanding, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	teams, err := r.ListTeams(competitionID)
	if err != nil {
		return nil, err
	}

	requiredSize := r.requiredTeamSize(competitionID)

	teamPlaceSum := make(map[int64]int)
	teamFirstPlaces := make(map[int64]int)
	teamSecondPlaces := make(map[int64]int)
	teamThirdPlaces := make(map[int64]int)
	teamNames := make(map[int64]string)
	teamFullRoster := make(map[int64]bool)
	teamMissedStage := make(map[int64]bool)

	for _, t := range teams {
		teamNames[t.ID] = t.Name
		teamFullRoster[t.ID] = t.ParticipantCount >= requiredSize
	}

	heldStages := 0
	for _, stage := range stages {
		ranking, held := r.computeStageTeamRanking(competitionID, stage.ID, requiredSize)
		if !held {
			continue
		}
		heldStages++
		place := 0
		for _, tr := range ranking {
			if !tr.Eligible {
				teamMissedStage[tr.TeamID] = true
				continue
			}
			place++
			teamPlaceSum[tr.TeamID] += place
			switch place {
			case 1:
				teamFirstPlaces[tr.TeamID]++
			case 2:
				teamSecondPlaces[tr.TeamID]++
			case 3:
				teamThirdPlaces[tr.TeamID]++
			}
		}
	}

	type teamScore struct {
		TeamID           int64
		TeamName         string
		TotalPlacePoints int
		FirstPlaces      int
		SecondPlaces     int
		ThirdPlaces      int
	}

	var competitive, outOfCompetition []teamScore
	for _, t := range teams {
		s := teamScore{
			TeamID:           t.ID,
			TeamName:         t.Name,
			TotalPlacePoints: teamPlaceSum[t.ID],
			FirstPlaces:      teamFirstPlaces[t.ID],
			SecondPlaces:     teamSecondPlaces[t.ID],
			ThirdPlaces:      teamThirdPlaces[t.ID],
		}
		if heldStages > 0 && teamFullRoster[t.ID] && !teamMissedStage[t.ID] {
			competitive = append(competitive, s)
		} else {
			outOfCompetition = append(outOfCompetition, s)
		}
	}

	sort.Slice(competitive, func(i, j int) bool {
		if competitive[i].TotalPlacePoints != competitive[j].TotalPlacePoints {
			return competitive[i].TotalPlacePoints < competitive[j].TotalPlacePoints
		}
		if competitive[i].FirstPlaces != competitive[j].FirstPlaces {
			return competitive[i].FirstPlaces > competitive[j].FirstPlaces
		}
		if competitive[i].SecondPlaces != competitive[j].SecondPlaces {
			return competitive[i].SecondPlaces > competitive[j].SecondPlaces
		}
		if competitive[i].ThirdPlaces != competitive[j].ThirdPlaces {
			return competitive[i].ThirdPlaces > competitive[j].ThirdPlaces
		}
		return competitive[i].TeamName < competitive[j].TeamName
	})
	sort.Slice(outOfCompetition, func(i, j int) bool {
		return outOfCompetition[i].TeamName < outOfCompetition[j].TeamName
	})

	var result []OverallStanding
	for i, s := range competitive {
		result = append(result, OverallStanding{
			Rank:             i + 1,
			TeamID:           s.TeamID,
			TeamName:         s.TeamName,
			TotalPlacePoints: s.TotalPlacePoints,
			FirstPlaces:      s.FirstPlaces,
			SecondPlaces:     s.SecondPlaces,
			ThirdPlaces:      s.ThirdPlaces,
		})
	}
	for _, s := range outOfCompetition {
		result = append(result, OverallStanding{
			TeamID:           s.TeamID,
			TeamName:         s.TeamName,
			TotalPlacePoints: s.TotalPlacePoints,
			FirstPlaces:      s.FirstPlaces,
			SecondPlaces:     s.SecondPlaces,
			ThirdPlaces:      s.ThirdPlaces,
			OutOfCompetition: true,
		})
	}
	return result, nil
}

func (r *Repository) GetStageStandings(competitionID int64) ([]StageStanding, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	teams, err := r.ListTeams(competitionID)
	if err != nil {
		return nil, err
	}

	requiredSize := r.requiredTeamSize(competitionID)

	var result []StageStanding
	for _, stage := range stages {
		ranking, _ := r.computeStageTeamRanking(competitionID, stage.ID, requiredSize)
		var results []StageTeamResult
		rank := 0
		for _, tr := range ranking {
			teamName := ""
			for _, t := range teams {
				if t.ID == tr.TeamID {
					teamName = t.Name
					break
				}
			}
			totalPenalties, totalTime := r.getTeamStageTotals(stage.ID, tr.TeamID)
			entry := StageTeamResult{
				StageID:        stage.ID,
				StageName:      stage.Name,
				OrderIndex:     stage.OrderIndex,
				TeamID:         tr.TeamID,
				TeamName:       teamName,
				TotalPenalties: totalPenalties,
				TotalTime:      totalTime,
			}
			if tr.Eligible {
				rank++
				entry.Rank = rank
			} else {
				entry.OutOfCompetition = true
			}
			results = append(results, entry)
		}
		result = append(result, StageStanding{
			StageID:    stage.ID,
			StageName:  stage.Name,
			OrderIndex: stage.OrderIndex,
			Results:    results,
		})
	}
	return result, nil
}

func (r *Repository) GetStageStandingsWithParticipants(competitionID int64) ([]StageStandingWithParticipants, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	teams, err := r.ListTeams(competitionID)
	if err != nil {
		return nil, err
	}

	requiredSize := r.requiredTeamSize(competitionID)

	var result []StageStandingWithParticipants
	for _, stage := range stages {
		ranking, _ := r.computeStageTeamRanking(competitionID, stage.ID, requiredSize)
		var teamResults []TeamResultWithParticipants
		rank := 0
		for _, tr := range ranking {
			teamName := ""
			for _, t := range teams {
				if t.ID == tr.TeamID {
					teamName = t.Name
					break
				}
			}
			totalPenalties, totalTime := r.getTeamStageTotals(stage.ID, tr.TeamID)
			participants := r.getStageParticipants(stage.ID, tr.TeamID)
			entry := TeamResultWithParticipants{
				TeamID:             tr.TeamID,
				TeamName:           teamName,
				TeamTotalPenalties: totalPenalties,
				TeamTotalTime:      totalTime,
				ParticipantCount:   len(participants),
				Participants:       participants,
			}
			if tr.Eligible {
				rank++
				entry.Rank = rank
			} else {
				entry.OutOfCompetition = true
			}
			teamResults = append(teamResults, entry)
		}
		result = append(result, StageStandingWithParticipants{
			StageID:     stage.ID,
			StageName:   stage.Name,
			OrderIndex:  stage.OrderIndex,
			TeamResults: teamResults,
		})
	}
	return result, nil
}

func (r *Repository) GetParticipantResults(competitionID int64, participantID int64) ([]ParticipantStageDetail, error) {
	query := `
		SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
			p.id AS participant_id, p.full_name, p.gender, p.age,
			t.name AS team_name,
			COALESCE(sr.penalty_points, 0) AS penalty_points,
			COALESCE(sr.time_seconds, 0) AS time_seconds
		FROM stages s
		CROSS JOIN participants p
		JOIN teams t ON t.id = p.team_id
		LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
		WHERE s.competition_id = ?
	`
	var results []ParticipantStageDetail
	if participantID > 0 {
		query += " AND p.id = ? ORDER BY s.order_index"
		if err := r.db.Select(&results, query, competitionID, participantID); err != nil {
			slog.Error("GetParticipantResults", "participantID", participantID, "error", err)
			return nil, err
		}
	} else {
		query += " ORDER BY s.order_index, t.name, p.full_name"
		if err := r.db.Select(&results, query, competitionID); err != nil {
			slog.Error("GetParticipantResults", "error", err)
			return nil, err
		}
	}
	return results, nil
}

func (r *Repository) GetParticipantsWithResults(competitionID int64, stageID int64) ([]ParticipantWithResults, error) {
	query := `
		SELECT p.id, p.team_id, p.full_name, p.gender, p.birth_date, p.age,
			t.name AS team_name,
			COALESCE(sr.time_seconds, 0) AS time_seconds,
			COALESCE(sr.penalty_points, 0) AS penalty_points
		FROM participants p
		JOIN teams t ON t.id = p.team_id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE t.competition_id = ?
		ORDER BY t.name, p.full_name
	`
	type row struct {
		ID            int64          `db:"id"`
		TeamID        int64          `db:"team_id"`
		FullName      string         `db:"full_name"`
		Gender        sql.NullString `db:"gender"`
		BirthDate     sql.NullString `db:"birth_date"`
		Age           int            `db:"age"`
		TeamName      string         `db:"team_name"`
		TimeSeconds   float64        `db:"time_seconds"`
		PenaltyPoints int            `db:"penalty_points"`
	}
	var rows []row
	if err := r.db.Select(&rows, query, stageID, competitionID); err != nil {
		slog.Error("GetParticipantsWithResults", "stageID", stageID, "error", err)
		return nil, err
	}
	results := make([]ParticipantWithResults, len(rows))
	for i, rw := range rows {
		results[i] = ParticipantWithResults{
			ID:            rw.ID,
			TeamID:        rw.TeamID,
			FullName:      rw.FullName,
			Age:           rw.Age,
			TeamName:      rw.TeamName,
			TimeSeconds:   rw.TimeSeconds,
			PenaltyPoints: rw.PenaltyPoints,
		}
		if rw.Gender.Valid {
			results[i].Gender = rw.Gender.String
		}
		if rw.BirthDate.Valid {
			results[i].BirthDate = rw.BirthDate.String
		}
	}
	return results, nil
}

func (r *Repository) GetAllCompetitionsStandings() ([]AllCompetitionStanding, error) {
	query := `
		SELECT c.name AS competition_name,
			t.name AS team_name,
			COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
			COALESCE(SUM(sr.time_seconds), 0) AS total_time
		FROM competitions c
		JOIN teams t ON t.competition_id = c.id
		LEFT JOIN participants p ON p.team_id = t.id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id
		LEFT JOIN stages s ON s.id = sr.stage_id AND s.competition_id = c.id
		GROUP BY c.id, t.id
		ORDER BY total_penalties ASC, total_time ASC
	`
	type row struct {
		CompetitionName string  `db:"competition_name"`
		TeamName        string  `db:"team_name"`
		TotalPenalties  int     `db:"total_penalties"`
		TotalTime       float64 `db:"total_time"`
	}
	var rows []row
	if err := r.db.Select(&rows, query); err != nil {
		slog.Error("GetAllCompetitionsStandings", "error", err)
		return nil, err
	}
	results := make([]AllCompetitionStanding, len(rows))
	for i, rw := range rows {
		results[i] = AllCompetitionStanding{
			Rank:              i + 1,
			TeamName:          rw.TeamName,
			CompetitionName:   rw.CompetitionName,
			RankInCompetition: i + 1,
			TotalPenalties:    rw.TotalPenalties,
			TotalTime:         rw.TotalTime,
		}
	}
	return results, nil
}

// ===== Individual Standings =====

func (r *Repository) GetIndividualStandings(competitionID int64) ([]IndividualStanding, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	type individualRow struct {
		ParticipantID int64          `db:"participant_id"`
		FullName      string         `db:"full_name"`
		Gender        sql.NullString `db:"gender"`
		BirthDate     sql.NullString `db:"birth_date"`
		Age           int            `db:"age"`
		TeamName      string         `db:"team_name"`
		PenaltyPoints int            `db:"penalty_points"`
		TimeSeconds   float64        `db:"time_seconds"`
	}

	query := `
		SELECT p.id AS participant_id, p.full_name, p.gender, p.birth_date, p.age,
			t.name AS team_name,
			COALESCE(sr.penalty_points, 0) AS penalty_points,
			COALESCE(sr.time_seconds, 0) AS time_seconds
		FROM participants p
		JOIN teams t ON t.id = p.team_id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE t.competition_id = ? AND sr.id IS NOT NULL
		ORDER BY penalty_points ASC, time_seconds ASC, p.age ASC
	`

	var result []IndividualStanding
	for _, stage := range stages {
		standing := IndividualStanding{
			StageID:   stage.ID,
			StageName: stage.Name,
			Boys:      []IndividualResult{},
			Girls:     []IndividualResult{},
		}

		var rows []individualRow
		if err := r.db.Select(&rows, query, stage.ID, competitionID); err != nil {
			slog.Error("GetIndividualStandings", "stageID", stage.ID, "error", err)
			return nil, err
		}

		boyRank, girlRank := 1, 1
		for _, rw := range rows {
			ir := IndividualResult{
				ParticipantID: rw.ParticipantID,
				FullName:      rw.FullName,
				Age:           rw.Age,
				TeamName:      rw.TeamName,
				PenaltyPoints: rw.PenaltyPoints,
				TimeSeconds:   rw.TimeSeconds,
			}
			if rw.Gender.Valid {
				ir.Gender = rw.Gender.String
			}
			if rw.BirthDate.Valid {
				ir.BirthDate = rw.BirthDate.String
			}

			switch ir.Gender {
			case "М":
				ir.Rank = boyRank
				boyRank++
				standing.Boys = append(standing.Boys, ir)
			case "Ж":
				ir.Rank = girlRank
				girlRank++
				standing.Girls = append(standing.Girls, ir)
			}
		}
		result = append(result, standing)
	}
	return result, nil
}

// ===== Stage Team Ranking Helpers =====

func (r *Repository) requiredTeamSize(competitionID int64) int {
	comp, err := r.GetCompetitionByID(competitionID)
	if err != nil || comp == nil {
		return defaultMaxParticipantsPerTeam
	}
	var settings CompetitionSettings
	if err := json.Unmarshal([]byte(comp.Settings), &settings); err != nil || settings.MaxParticipantsPerTeam <= 0 {
		return defaultMaxParticipantsPerTeam
	}
	return settings.MaxParticipantsPerTeam
}

type stageTeamRank struct {
	TeamID   int64
	Eligible bool
}

func (r *Repository) computeStageTeamRanking(competitionID, stageID int64, requiredSize int) ([]stageTeamRank, bool) {
	query := `
		SELECT t.id AS team_id,
			COUNT(DISTINCT p.id) AS participant_count,
			COUNT(DISTINCT sr.id) AS result_count,
			COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
			COALESCE(SUM(sr.time_seconds), 0) AS total_time
		FROM teams t
		LEFT JOIN participants p ON p.team_id = t.id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE t.competition_id = ?
		GROUP BY t.id
		ORDER BY
			CASE WHEN COUNT(DISTINCT p.id) >= ? AND COUNT(DISTINCT sr.id) > 0 THEN 0 ELSE 1 END,
			total_penalties ASC, total_time ASC, t.name ASC
	`
	type row struct {
		TeamID           int64   `db:"team_id"`
		ParticipantCount int     `db:"participant_count"`
		ResultCount      int     `db:"result_count"`
		TotalPenalties   int     `db:"total_penalties"`
		TotalTime        float64 `db:"total_time"`
	}
	var rows []row
	if err := r.db.Select(&rows, query, stageID, competitionID, requiredSize); err != nil {
		slog.Error("computeStageTeamRanking", "stageID", stageID, "error", err)
		return nil, false
	}
	ranking := make([]stageTeamRank, len(rows))
	held := false
	for i, rw := range rows {
		if rw.ResultCount > 0 {
			held = true
		}
		ranking[i] = stageTeamRank{
			TeamID:   rw.TeamID,
			Eligible: rw.ParticipantCount >= requiredSize && rw.ResultCount > 0,
		}
	}
	return ranking, held
}

func (r *Repository) getTeamStageTotals(stageID int64, teamID int64) (int, float64) {
	query := `
		SELECT COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
			COALESCE(SUM(sr.time_seconds), 0) AS total_time
		FROM participants p
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE p.team_id = ?
	`
	type row struct {
		TotalPenalties int     `db:"total_penalties"`
		TotalTime      float64 `db:"total_time"`
	}
	var rw row
	if err := r.db.Get(&rw, query, stageID, teamID); err != nil {
		slog.Error("getTeamStageTotals", "stageID", stageID, "teamID", teamID, "error", err)
		return 0, 0
	}
	return rw.TotalPenalties, rw.TotalTime
}

func (r *Repository) getStageParticipants(stageID int64, teamID int64) []ParticipantResult {
	query := `
		SELECT p.id AS participant_id, p.full_name, p.gender, p.age,
			COALESCE(sr.penalty_points, 0) AS penalty_points,
			COALESCE(sr.time_seconds, 0) AS time_seconds
		FROM participants p
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE p.team_id = ?
		ORDER BY p.full_name
	`
	type row struct {
		ParticipantID int64          `db:"participant_id"`
		FullName      string         `db:"full_name"`
		Gender        sql.NullString `db:"gender"`
		Age           int            `db:"age"`
		PenaltyPoints int            `db:"penalty_points"`
		TimeSeconds   float64        `db:"time_seconds"`
	}
	var rows []row
	if err := r.db.Select(&rows, query, stageID, teamID); err != nil {
		slog.Error("getStageParticipants", "stageID", stageID, "teamID", teamID, "error", err)
		return nil
	}
	participants := make([]ParticipantResult, len(rows))
	for i, rw := range rows {
		participants[i] = ParticipantResult{
			ParticipantID: rw.ParticipantID,
			FullName:      rw.FullName,
			Age:           rw.Age,
			PenaltyPoints: rw.PenaltyPoints,
			TimeSeconds:   rw.TimeSeconds,
		}
		if rw.Gender.Valid {
			participants[i].Gender = rw.Gender.String
		}
	}
	return participants
}

// ===== Statistics =====

func (r *Repository) GetParticipantStatistics(competitionID int64, participantID int64) (*ParticipantStatistics, error) {
	// Get participant info
	participant, err := r.GetParticipantByID(participantID)
	if err != nil || participant == nil {
		return nil, fmt.Errorf("участник не найден")
	}

	team, err := r.GetTeamByID(participant.TeamID)
	if err != nil || team == nil {
		return nil, fmt.Errorf("команда не найдена")
	}

	gender := ""
	if participant.Gender != nil {
		gender = *participant.Gender
	}

	// Get stage results for this participant
	type stageRow struct {
		StageID       int64   `db:"stage_id"`
		StageName     string  `db:"stage_name"`
		OrderIndex    int     `db:"order_index"`
		PenaltyPoints int     `db:"penalty_points"`
		TimeSeconds   float64 `db:"time_seconds"`
	}
	query := `
		SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
			COALESCE(sr.penalty_points, 0) AS penalty_points,
			COALESCE(sr.time_seconds, 0) AS time_seconds
		FROM stages s
		LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = ?
		WHERE s.competition_id = ?
		ORDER BY s.order_index
	`
	var rows []stageRow
	if err := r.db.Select(&rows, query, participantID, competitionID); err != nil {
		slog.Error("GetParticipantStatistics query", "participantID", participantID, "error", err)
		return nil, err
	}

	stageResults := make([]ParticipantStageStat, 0, len(rows))
	totalPenalties := 0
	totalTime := 0.0
	stageCount := 0
	bestStage := ""
	worstStage := ""
	bestPenalties := -1
	worstPenalties := -1

	for _, rw := range rows {
		stageRank := r.computeParticipantStageRank(competitionID, rw.StageID, participantID, gender)
		stageResults = append(stageResults, ParticipantStageStat{
			StageID:       rw.StageID,
			StageName:     rw.StageName,
			OrderIndex:    rw.OrderIndex,
			PenaltyPoints: rw.PenaltyPoints,
			TimeSeconds:   rw.TimeSeconds,
			StageRank:     stageRank,
		})
		if rw.TimeSeconds > 0 || rw.PenaltyPoints > 0 {
			totalPenalties += rw.PenaltyPoints
			totalTime += rw.TimeSeconds
			stageCount++
			if bestPenalties < 0 || rw.PenaltyPoints < bestPenalties {
				bestPenalties = rw.PenaltyPoints
				bestStage = rw.StageName
			}
			if worstPenalties < 0 || rw.PenaltyPoints > worstPenalties {
				worstPenalties = rw.PenaltyPoints
				worstStage = rw.StageName
			}
		}
	}

	avgTime := 0.0
	if stageCount > 0 {
		avgTime = totalTime / float64(stageCount)
	}

	// Compute overall rank among same gender
	overallRank := r.computeParticipantOverallRank(competitionID, participantID, gender)
	// Compute rank within team
	teamRank := r.computeParticipantTeamRank(participantID, participant.TeamID)

	birthDate := ""
	if participant.BirthDate != nil {
		birthDate = *participant.BirthDate
	}

	return &ParticipantStatistics{
		ParticipantID:  participant.ID,
		FullName:       participant.FullName,
		Gender:         gender,
		Age:            participant.Age,
		BirthDate:      birthDate,
		TeamName:       team.Name,
		StageResults:   stageResults,
		TotalPenalties: totalPenalties,
		TotalTime:      totalTime,
		BestStage:      bestStage,
		WorstStage:     worstStage,
		AvgTime:        avgTime,
		OverallRank:    overallRank,
		TeamRank:       teamRank,
	}, nil
}

func (r *Repository) computeParticipantStageRank(competitionID, stageID, participantID int64, gender string) int {
	query := `
		SELECT p.id, COALESCE(sr.penalty_points, 0) AS penalty_points, COALESCE(sr.time_seconds, 0) AS time_seconds, p.age
		FROM participants p
		JOIN teams t ON t.id = p.team_id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE t.competition_id = ? AND sr.id IS NOT NULL AND p.gender = ?
		ORDER BY penalty_points ASC, time_seconds ASC, p.age ASC
	`
	type row struct {
		ID            int64   `db:"id"`
		PenaltyPoints int     `db:"penalty_points"`
		TimeSeconds   float64 `db:"time_seconds"`
		Age           int     `db:"age"`
	}
	var rows []row
	if err := r.db.Select(&rows, query, stageID, competitionID, gender); err != nil {
		return 0
	}
	for i, rw := range rows {
		if rw.ID == participantID {
			return i + 1
		}
	}
	return 0
}

func (r *Repository) computeParticipantOverallRank(competitionID, participantID int64, gender string) int {
	stages, err := r.ListStages(competitionID)
	if err != nil || len(stages) == 0 {
		return 0
	}

	// Aggregate penalties and time across all stages for each participant of same gender
	query := `
		SELECT p.id, COALESCE(SUM(sr.penalty_points), 0) AS total_penalties, COALESCE(SUM(sr.time_seconds), 0) AS total_time, p.age
		FROM participants p
		JOIN teams t ON t.id = p.team_id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id
		WHERE t.competition_id = ? AND p.gender = ?
		GROUP BY p.id
		HAVING total_penalties > 0 OR total_time > 0
		ORDER BY total_penalties ASC, total_time ASC, p.age ASC
	`
	type row struct {
		ID             int64   `db:"id"`
		TotalPenalties int     `db:"total_penalties"`
		TotalTime      float64 `db:"total_time"`
		Age            int     `db:"age"`
	}
	var rows []row
	if err := r.db.Select(&rows, query, competitionID, gender); err != nil {
		return 0
	}
	for i, rw := range rows {
		if rw.ID == participantID {
			return i + 1
		}
	}
	return 0
}

func (r *Repository) computeParticipantTeamRank(participantID, teamID int64) int {
	query := `
		SELECT p.id, COALESCE(SUM(sr.penalty_points), 0) AS total_penalties, COALESCE(SUM(sr.time_seconds), 0) AS total_time, p.age
		FROM participants p
		LEFT JOIN stage_results sr ON sr.participant_id = p.id
		WHERE p.team_id = ?
		GROUP BY p.id
		HAVING total_penalties > 0 OR total_time > 0
		ORDER BY total_penalties ASC, total_time ASC, p.age ASC
	`
	type row struct {
		ID             int64   `db:"id"`
		TotalPenalties int     `db:"total_penalties"`
		TotalTime      float64 `db:"total_time"`
		Age            int     `db:"age"`
	}
	var rows []row
	if err := r.db.Select(&rows, query, teamID); err != nil {
		return 0
	}
	for i, rw := range rows {
		if rw.ID == participantID {
			return i + 1
		}
	}
	return 0
}

func (r *Repository) GetTeamStatistics(competitionID int64, teamID int64) (*TeamStatistics, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	team, err := r.GetTeamByID(teamID)
	if err != nil || team == nil {
		return nil, fmt.Errorf("команда не найдена")
	}

	participants, err := r.ListParticipants(teamID)
	if err != nil {
		return nil, err
	}

	// Stage stats for team
	stageResults := make([]TeamStageStat, 0, len(stages))
	totalPenalties := 0
	totalTime := 0.0
	for _, stage := range stages {
		penalties, time := r.getTeamStageTotals(stage.ID, teamID)
		stageRank := r.computeTeamStageRank(competitionID, stage.ID, teamID)
		stageResults = append(stageResults, TeamStageStat{
			StageID:        stage.ID,
			StageName:      stage.Name,
			OrderIndex:     stage.OrderIndex,
			TotalPenalties: penalties,
			TotalTime:      time,
			StageRank:      stageRank,
		})
		totalPenalties += penalties
		totalTime += time
	}

	// Avg age
	avgAge := 0.0
	if len(participants) > 0 {
		sum := 0
		for _, p := range participants {
			sum += p.Age
		}
		avgAge = float64(sum) / float64(len(participants))
	}

	// Participants statistics
	participantStats := make([]ParticipantStatistics, 0, len(participants))
	for _, p := range participants {
		ps, err := r.GetParticipantStatistics(competitionID, p.ID)
		if err != nil {
			continue
		}
		participantStats = append(participantStats, *ps)
	}

	// Overall rank
	overallRank := r.computeTeamOverallRank(competitionID, teamID)

	return &TeamStatistics{
		TeamID:           team.ID,
		TeamName:         team.Name,
		ParticipantCount: len(participants),
		AvgAge:           avgAge,
		TotalPenalties:   totalPenalties,
		TotalTime:        totalTime,
		StageResults:     stageResults,
		Participants:     participantStats,
		OverallRank:      overallRank,
	}, nil
}

func (r *Repository) computeTeamStageRank(competitionID, stageID, teamID int64) int {
	ranking, _ := r.computeStageTeamRanking(competitionID, stageID, r.requiredTeamSize(competitionID))
	place := 0
	for _, tr := range ranking {
		if !tr.Eligible {
			continue
		}
		place++
		if tr.TeamID == teamID {
			return place
		}
	}
	return 0
}

func (r *Repository) computeTeamOverallRank(competitionID, teamID int64) int {
	standings, err := r.ComputeStandings(competitionID)
	if err != nil {
		return 0
	}
	for _, s := range standings {
		if s.TeamID == teamID {
			return s.Rank
		}
	}
	return 0
}

// ===== Helpers =====

func calcAge(birthDate string) int {
	t, err := time.Parse("2006-01-02", birthDate)
	if err != nil {
		t, err = time.Parse("2006-01-02T15:04:05Z", birthDate)
	}
	if err != nil {
		return 0
	}
	now := time.Now()
	age := now.Year() - t.Year()
	if now.Month() < t.Month() || (now.Month() == t.Month() && now.Day() < t.Day()) {
		age--
	}
	if age < 0 {
		age = 0
	}
	return age
}

func (r *Repository) GetDB() *DB {
	return r.db
}

func FormatTime(seconds float64) string {
	if seconds == 0 {
		return "00:00"
	}
	minutes := int(seconds) / 60
	secs := int(seconds) % 60
	return fmt.Sprintf("%02d:%02d", minutes, secs)
}

func ParseTimeToSeconds(timeStr string) float64 {
	if timeStr == "" || timeStr == "00:00" {
		return 0
	}
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return 0
	}
	minutes, _ := strconv.Atoi(parts[0])
	secs, _ := strconv.Atoi(parts[1])
	return float64(minutes*60 + secs)
}
