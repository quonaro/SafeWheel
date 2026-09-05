package database

import (
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Repository struct {
	db *DB
}

func NewRepository(db *DB) *Repository {
	return &Repository{db: db}
}

// ===== Competitions =====

func (r *Repository) ListCompetitions() ([]Competition, error) {
	rows, err := r.db.Query("SELECT id, name, description, settings, created_at, updated_at FROM competitions ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCompetitions(rows)
}

func (r *Repository) GetCompetitionByID(id int64) (*Competition, error) {
	row := r.db.QueryRow("SELECT id, name, description, settings, created_at, updated_at FROM competitions WHERE id = ?", id)
	c := &Competition{}
	err := row.Scan(&c.ID, &c.Name, &c.Description, &c.Settings, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *Repository) CreateCompetition(data Competition) (*Competition, error) {
	settings := data.Settings
	if settings == "" {
		settings = `{"maxParticipantsPerTeam":4}`
	}
	res, err := r.db.Exec(
		"INSERT INTO competitions (name, description, settings, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
		strings.TrimSpace(data.Name), strings.TrimSpace(data.Description), settings,
	)
	if err != nil {
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
	_, err := r.db.Exec(
		"UPDATE competitions SET name = ?, description = ?, settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		strings.TrimSpace(data.Name), strings.TrimSpace(data.Description), settings, id,
	)
	if err != nil {
		return nil, err
	}
	return r.GetCompetitionByID(id)
}

func (r *Repository) DeleteCompetition(id int64) error {
	_, err := r.db.Exec("DELETE FROM competitions WHERE id = ?", id)
	return err
}

// ===== Teams =====

func (r *Repository) ListTeams(competitionID int64) ([]Team, error) {
	rows, err := r.db.Query("SELECT id, competition_id, name, created_at, updated_at FROM teams WHERE competition_id = ? ORDER BY name ASC", competitionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var teams []Team
	for rows.Next() {
		var t Team
		if err := rows.Scan(&t.ID, &t.CompetitionID, &t.Name, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		teams = append(teams, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return teams, nil
}

func (r *Repository) GetTeamByID(id int64) (*Team, error) {
	t := &Team{}
	err := r.db.QueryRow("SELECT id, competition_id, name, created_at, updated_at FROM teams WHERE id = ?", id).
		Scan(&t.ID, &t.CompetitionID, &t.Name, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return t, err
}

func (r *Repository) CreateTeam(competitionID int64, name string) (*Team, error) {
	res, err := r.db.Exec("INSERT INTO teams (competition_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", competitionID, strings.TrimSpace(name))
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetTeamByID(id)
}

func (r *Repository) UpdateTeam(id int64, name string) (*Team, error) {
	_, err := r.db.Exec("UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", strings.TrimSpace(name), id)
	if err != nil {
		return nil, err
	}
	return r.GetTeamByID(id)
}

func (r *Repository) DeleteTeam(id int64) error {
	_, err := r.db.Exec("DELETE FROM teams WHERE id = ?", id)
	return err
}

// ===== Participants =====

func (r *Repository) ListParticipants(teamID int64) ([]Participant, error) {
	rows, err := r.db.Query("SELECT id, team_id, full_name, gender, birth_date, age, created_at, updated_at FROM participants WHERE team_id = ? ORDER BY id ASC", teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanParticipants(rows)
}

func (r *Repository) GetParticipantByID(id int64) (*Participant, error) {
	p := &Participant{}
	err := r.db.QueryRow("SELECT id, team_id, full_name, gender, birth_date, age, created_at, updated_at FROM participants WHERE id = ?", id).
		Scan(&p.ID, &p.TeamID, &p.FullName, &p.Gender, &p.BirthDate, &p.Age, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (r *Repository) CreateParticipant(teamID int64, p Participant) (*Participant, error) {
	var count int
	r.db.QueryRow("SELECT COUNT(1) FROM participants WHERE team_id = ?", teamID).Scan(&count)
	if count >= 4 {
		return nil, fmt.Errorf("в команде не может быть больше 4 участников")
	}

	age := p.Age
	if p.BirthDate != nil && age == 0 {
		age = calcAge(*p.BirthDate)
	}

	res, err := r.db.Exec(
		"INSERT INTO participants (team_id, full_name, gender, birth_date, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
		teamID, strings.TrimSpace(p.FullName), p.Gender, p.BirthDate, age,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
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
		return nil, err
	}
	return r.GetParticipantByID(id)
}

func (r *Repository) DeleteParticipant(id int64) error {
	_, err := r.db.Exec("DELETE FROM participants WHERE id = ?", id)
	return err
}

// ===== Stages =====

func (r *Repository) ListStages(competitionID int64) ([]Stage, error) {
	rows, err := r.db.Query("SELECT id, competition_id, name, order_index, created_at, updated_at FROM stages WHERE competition_id = ? ORDER BY id ASC", competitionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stages []Stage
	for rows.Next() {
		var s Stage
		if err := rows.Scan(&s.ID, &s.CompetitionID, &s.Name, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		stages = append(stages, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return stages, nil
}

func (r *Repository) GetStageByID(id int64) (*Stage, error) {
	s := &Stage{}
	err := r.db.QueryRow("SELECT id, competition_id, name, order_index, created_at, updated_at FROM stages WHERE id = ?", id).
		Scan(&s.ID, &s.CompetitionID, &s.Name, &s.OrderIndex, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *Repository) CreateStage(competitionID int64, name string) (*Stage, error) {
	res, err := r.db.Exec("INSERT INTO stages (competition_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", competitionID, strings.TrimSpace(name))
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return r.GetStageByID(id)
}

func (r *Repository) UpdateStage(id int64, name string) (*Stage, error) {
	_, err := r.db.Exec("UPDATE stages SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", strings.TrimSpace(name), id)
	if err != nil {
		return nil, err
	}
	return r.GetStageByID(id)
}

func (r *Repository) DeleteStage(id int64) error {
	_, err := r.db.Exec("DELETE FROM stages WHERE id = ?", id)
	return err
}

// ===== Results =====

func (r *Repository) UpsertStageResult(stageID, participantID int64, timeSeconds float64, penaltyPoints int, correctAnswers int) (*StageResult, error) {
	var existingID int64
	err := r.db.QueryRow("SELECT id FROM stage_results WHERE stage_id = ? AND participant_id = ?", stageID, participantID).Scan(&existingID)
	switch err {
	case nil:
		_, err = r.db.Exec("UPDATE stage_results SET time_seconds = ?, penalty_points = ?, correct_answers = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", timeSeconds, penaltyPoints, correctAnswers, existingID)
		if err != nil {
			return nil, err
		}
	case sql.ErrNoRows:
		res, err := r.db.Exec("INSERT INTO stage_results (stage_id, participant_id, time_seconds, penalty_points, correct_answers, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", stageID, participantID, timeSeconds, penaltyPoints, correctAnswers)
		if err != nil {
			return nil, err
		}
		existingID, _ = res.LastInsertId()
	default:
		return nil, err
	}

	sr := &StageResult{}
	err = r.db.QueryRow("SELECT id, stage_id, participant_id, time_seconds, penalty_points, correct_answers, created_at, updated_at FROM stage_results WHERE id = ?", existingID).
		Scan(&sr.ID, &sr.StageID, &sr.ParticipantID, &sr.TimeSeconds, &sr.PenaltyPoints, &sr.CorrectAnswers, &sr.CreatedAt, &sr.UpdatedAt)
	return sr, err
}

func (r *Repository) GetStageResults(stageID int64) ([]StageResult, error) {
	rows, err := r.db.Query("SELECT id, stage_id, participant_id, time_seconds, penalty_points, correct_answers, created_at, updated_at FROM stage_results WHERE stage_id = ?", stageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []StageResult
	for rows.Next() {
		var sr StageResult
		if err := rows.Scan(&sr.ID, &sr.StageID, &sr.ParticipantID, &sr.TimeSeconds, &sr.PenaltyPoints, &sr.CorrectAnswers, &sr.CreatedAt, &sr.UpdatedAt); err != nil {
			return nil, err
		}
		results = append(results, sr)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// ===== Standings =====

func (r *Repository) ComputeStandings(competitionID int64, maxParticipantsPerTeam int) ([]OverallStanding, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	teams, err := r.ListTeams(competitionID)
	if err != nil {
		return nil, err
	}

	teamPlaceSum := make(map[int64]int)
	teamFirstPlaces := make(map[int64]int)
	teamSecondPlaces := make(map[int64]int)
	teamThirdPlaces := make(map[int64]int)
	teamNames := make(map[int64]string)

	for _, t := range teams {
		teamNames[t.ID] = t.Name
	}

	for _, stage := range stages {
		stageTeams := r.computeStageTeamRanking(competitionID, stage.ID)
		for rank, teamID := range stageTeams {
			place := rank + 1
			teamPlaceSum[teamID] += place
			switch place {
			case 1:
				teamFirstPlaces[teamID]++
			case 2:
				teamSecondPlaces[teamID]++
			case 3:
				teamThirdPlaces[teamID]++
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

	var scores []teamScore
	for _, t := range teams {
		scores = append(scores, teamScore{
			TeamID:           t.ID,
			TeamName:         t.Name,
			TotalPlacePoints: teamPlaceSum[t.ID],
			FirstPlaces:      teamFirstPlaces[t.ID],
			SecondPlaces:     teamSecondPlaces[t.ID],
			ThirdPlaces:      teamThirdPlaces[t.ID],
		})
	}

	sort.Slice(scores, func(i, j int) bool {
		if scores[i].TotalPlacePoints != scores[j].TotalPlacePoints {
			return scores[i].TotalPlacePoints < scores[j].TotalPlacePoints
		}
		if scores[i].FirstPlaces != scores[j].FirstPlaces {
			return scores[i].FirstPlaces > scores[j].FirstPlaces
		}
		if scores[i].SecondPlaces != scores[j].SecondPlaces {
			return scores[i].SecondPlaces > scores[j].SecondPlaces
		}
		return scores[i].ThirdPlaces > scores[j].ThirdPlaces
	})

	var result []OverallStanding
	for i, s := range scores {
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

	var result []StageStanding
	for _, stage := range stages {
		rankedTeamIDs := r.computeStageTeamRanking(competitionID, stage.ID)
		var results []StageTeamResult
		for rank, teamID := range rankedTeamIDs {
			teamName := ""
			for _, t := range teams {
				if t.ID == teamID {
					teamName = t.Name
					break
				}
			}
			totalPoints, totalTime := r.getTeamStageTotals(stage.ID, teamID)
			results = append(results, StageTeamResult{
				Rank:        rank + 1,
				StageID:     stage.ID,
				StageName:   stage.Name,
				OrderIndex:  stage.OrderIndex,
				TeamID:      teamID,
				TeamName:    teamName,
				TotalPoints: totalPoints,
				TotalTime:   totalTime,
			})
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

	var result []StageStandingWithParticipants
	for _, stage := range stages {
		rankedTeamIDs := r.computeStageTeamRanking(competitionID, stage.ID)
		var teamResults []TeamResultWithParticipants
		for rank, teamID := range rankedTeamIDs {
			teamName := ""
			for _, t := range teams {
				if t.ID == teamID {
					teamName = t.Name
					break
				}
			}
			totalPoints, totalTime := r.getTeamStageTotals(stage.ID, teamID)
			participants := r.getStageParticipants(stage.ID, teamID)
			teamResults = append(teamResults, TeamResultWithParticipants{
				TeamID:           teamID,
				TeamName:         teamName,
				TeamTotalPoints:  totalPoints,
				TeamTotalTime:    totalTime,
				ParticipantCount: len(participants),
				Rank:             rank + 1,
				Participants:     participants,
			})
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
	var rows *sql.Rows
	var err error

	if participantID > 0 {
		query := `
			SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
				p.id AS participant_id, p.full_name, p.gender, p.age,
				t.name AS team_name,
				COALESCE(sr.penalty_points, 0) AS penalty_points,
				COALESCE(sr.correct_answers, 0) AS correct_answers,
				COALESCE(sr.correct_answers, 0) - COALESCE(sr.penalty_points, 0) AS points,
				COALESCE(sr.time_seconds, 0) AS time_seconds
			FROM stages s
			CROSS JOIN participants p
			JOIN teams t ON t.id = p.team_id
			LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
			WHERE s.competition_id = ? AND p.id = ?
			ORDER BY s.order_index
		`
		rows, err = r.db.Query(query, competitionID, participantID)
	} else {
		query := `
			SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
				p.id AS participant_id, p.full_name, p.gender, p.age,
				t.name AS team_name,
				COALESCE(sr.penalty_points, 0) AS penalty_points,
				COALESCE(sr.correct_answers, 0) AS correct_answers,
				COALESCE(sr.correct_answers, 0) - COALESCE(sr.penalty_points, 0) AS points,
				COALESCE(sr.time_seconds, 0) AS time_seconds
			FROM stages s
			CROSS JOIN participants p
			JOIN teams t ON t.id = p.team_id
			LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
			WHERE s.competition_id = ?
			ORDER BY s.order_index, t.name, p.full_name
		`
		rows, err = r.db.Query(query, competitionID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ParticipantStageDetail
	for rows.Next() {
		var d ParticipantStageDetail
		if err := rows.Scan(&d.StageID, &d.StageName, &d.OrderIndex, &d.ParticipantID, &d.FullName, &d.Gender, &d.Age, &d.TeamName, &d.PenaltyPoints, &d.CorrectAnswers, &d.Points, &d.TimeSeconds); err != nil {
			return nil, err
		}
		results = append(results, d)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

func (r *Repository) GetParticipantsWithResults(competitionID int64, stageID int64) ([]ParticipantWithResults, error) {
	query := `
		SELECT p.id, p.team_id, p.full_name, p.gender, p.birth_date, p.age,
			t.name AS team_name,
			COALESCE(sr.time_seconds, 0) AS time_seconds,
			COALESCE(sr.penalty_points, 0) AS penalty_points,
			COALESCE(sr.correct_answers, 0) AS correct_answers
		FROM participants p
		JOIN teams t ON t.id = p.team_id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE t.competition_id = ?
		ORDER BY t.name, p.full_name
	`
	rows, err := r.db.Query(query, stageID, competitionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ParticipantWithResults
	for rows.Next() {
		var p ParticipantWithResults
		var gender sql.NullString
		var birthDate sql.NullString
		if err := rows.Scan(&p.ID, &p.TeamID, &p.FullName, &gender, &birthDate, &p.Age, &p.TeamName, &p.TimeSeconds, &p.PenaltyPoints, &p.CorrectAnswers); err != nil {
			return nil, err
		}
		if gender.Valid {
			p.Gender = gender.String
		}
		if birthDate.Valid {
			p.BirthDate = birthDate.String
		}
		results = append(results, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
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
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []AllCompetitionStanding
	rank := 1
	for rows.Next() {
		var s AllCompetitionStanding
		if err := rows.Scan(&s.CompetitionName, &s.TeamName, &s.TotalPenalties, &s.TotalTime); err != nil {
			return nil, err
		}
		s.Rank = rank
		s.RankInCompetition = rank
		results = append(results, s)
		rank++
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// ===== Individual Standings =====

func (r *Repository) GetIndividualStandings(competitionID int64) ([]IndividualStanding, error) {
	stages, err := r.ListStages(competitionID)
	if err != nil {
		return nil, err
	}

	var result []IndividualStanding
	for _, stage := range stages {
		standing := IndividualStanding{
			StageID:   stage.ID,
			StageName: stage.Name,
			Boys:      []IndividualResult{},
			Girls:     []IndividualResult{},
		}

		query := `
			SELECT p.id, p.full_name, p.gender, p.birth_date, p.age,
				t.name AS team_name,
				COALESCE(sr.correct_answers, 0) AS correct_answers,
				COALESCE(sr.penalty_points, 0) AS penalty_points,
				COALESCE(sr.correct_answers, 0) - COALESCE(sr.penalty_points, 0) AS points,
				COALESCE(sr.time_seconds, 0) AS time_seconds
			FROM participants p
			JOIN teams t ON t.id = p.team_id
			LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
			WHERE t.competition_id = ? AND sr.id IS NOT NULL
			ORDER BY points DESC, time_seconds ASC, p.age ASC
		`
		rows, err := r.db.Query(query, stage.ID, competitionID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		boyRank, girlRank := 1, 1
		for rows.Next() {
			var ir IndividualResult
			var gender sql.NullString
			var birthDate sql.NullString
			if err := rows.Scan(&ir.ParticipantID, &ir.FullName, &gender, &birthDate, &ir.Age, &ir.TeamName, &ir.CorrectAnswers, &ir.PenaltyPoints, &ir.Points, &ir.TimeSeconds); err != nil {
				return nil, err
			}
			if gender.Valid {
				ir.Gender = gender.String
			}
			if birthDate.Valid {
				ir.BirthDate = birthDate.String
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
		if err := rows.Err(); err != nil {
			return nil, err
		}
		result = append(result, standing)
	}
	return result, nil
}

// ===== Stage Team Ranking Helpers =====

func (r *Repository) computeStageTeamRanking(competitionID int64, stageID int64) []int64 {
	query := `
		SELECT t.id AS team_id,
			COALESCE(SUM(sr.correct_answers - sr.penalty_points), 0) AS total_points,
			COALESCE(SUM(sr.time_seconds), 0) AS total_time
		FROM teams t
		LEFT JOIN participants p ON p.team_id = t.id
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE t.competition_id = ?
		GROUP BY t.id
		ORDER BY total_points DESC, total_time ASC
	`
	rows, err := r.db.Query(query, stageID, competitionID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var teamIDs []int64
	for rows.Next() {
		var teamID int64
		var totalPoints int
		var totalTime float64
		if err := rows.Scan(&teamID, &totalPoints, &totalTime); err != nil {
			return nil
		}
		teamIDs = append(teamIDs, teamID)
	}
	if err := rows.Err(); err != nil {
		return nil
	}
	return teamIDs
}

func (r *Repository) getTeamStageTotals(stageID int64, teamID int64) (int, float64) {
	query := `
		SELECT COALESCE(SUM(sr.correct_answers - sr.penalty_points), 0) AS total_points,
			COALESCE(SUM(sr.time_seconds), 0) AS total_time
		FROM participants p
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE p.team_id = ?
	`
	var totalPoints int
	var totalTime float64
	r.db.QueryRow(query, stageID, teamID).Scan(&totalPoints, &totalTime)
	return totalPoints, totalTime
}

func (r *Repository) getStageParticipants(stageID int64, teamID int64) []ParticipantResult {
	query := `
		SELECT p.id, p.full_name, p.gender, p.age,
			COALESCE(sr.penalty_points, 0) AS penalty_points,
			COALESCE(sr.correct_answers, 0) AS correct_answers,
			COALESCE(sr.correct_answers, 0) - COALESCE(sr.penalty_points, 0) AS points,
			COALESCE(sr.time_seconds, 0) AS time_seconds
		FROM participants p
		LEFT JOIN stage_results sr ON sr.participant_id = p.id AND sr.stage_id = ?
		WHERE p.team_id = ?
		ORDER BY p.full_name
	`
	rows, err := r.db.Query(query, stageID, teamID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var participants []ParticipantResult
	for rows.Next() {
		var pr ParticipantResult
		var gender sql.NullString
		if err := rows.Scan(&pr.ParticipantID, &pr.FullName, &gender, &pr.Age, &pr.PenaltyPoints, &pr.CorrectAnswers, &pr.Points, &pr.TimeSeconds); err != nil {
			return nil
		}
		if gender.Valid {
			pr.Gender = gender.String
		}
		participants = append(participants, pr)
	}
	if err := rows.Err(); err != nil {
		return nil
	}
	return participants
}

// ===== Helpers =====

func scanCompetitions(rows *sql.Rows) ([]Competition, error) {
	var comps []Competition
	for rows.Next() {
		var c Competition
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Settings, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		comps = append(comps, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return comps, nil
}

func scanParticipants(rows *sql.Rows) ([]Participant, error) {
	var participants []Participant
	for rows.Next() {
		var p Participant
		if err := rows.Scan(&p.ID, &p.TeamID, &p.FullName, &p.Gender, &p.BirthDate, &p.Age, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return participants, nil
}

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
