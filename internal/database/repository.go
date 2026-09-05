package database

import (
	"database/sql"
	"fmt"
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
	if p.BirthDate.Valid && age == 0 {
		age = calcAge(p.BirthDate.String)
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
	if p.BirthDate.Valid && age == 0 {
		age = calcAge(p.BirthDate.String)
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

func (r *Repository) UpsertStageResult(stageID, participantID int64, timeSeconds float64, penaltyPoints int) (*StageResult, error) {
	var existingID int64
	err := r.db.QueryRow("SELECT id FROM stage_results WHERE stage_id = ? AND participant_id = ?", stageID, participantID).Scan(&existingID)
	if err == nil {
		_, err = r.db.Exec("UPDATE stage_results SET time_seconds = ?, penalty_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", timeSeconds, penaltyPoints, existingID)
		if err != nil {
			return nil, err
		}
	} else if err == sql.ErrNoRows {
		res, err := r.db.Exec("INSERT INTO stage_results (stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", stageID, participantID, timeSeconds, penaltyPoints)
		if err != nil {
			return nil, err
		}
		existingID, _ = res.LastInsertId()
	} else {
		return nil, err
	}

	sr := &StageResult{}
	err = r.db.QueryRow("SELECT id, stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at FROM stage_results WHERE id = ?", existingID).
		Scan(&sr.ID, &sr.StageID, &sr.ParticipantID, &sr.TimeSeconds, &sr.PenaltyPoints, &sr.CreatedAt, &sr.UpdatedAt)
	return sr, err
}

func (r *Repository) GetStageResults(stageID int64) ([]StageResult, error) {
	rows, err := r.db.Query("SELECT id, stage_id, participant_id, time_seconds, penalty_points, created_at, updated_at FROM stage_results WHERE stage_id = ?", stageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []StageResult
	for rows.Next() {
		var sr StageResult
		if err := rows.Scan(&sr.ID, &sr.StageID, &sr.ParticipantID, &sr.TimeSeconds, &sr.PenaltyPoints, &sr.CreatedAt, &sr.UpdatedAt); err != nil {
			return nil, err
		}
		results = append(results, sr)
	}
	return results, nil
}

// ===== Standings =====

func (r *Repository) ComputeStandings(competitionID int64, maxParticipantsPerTeam int) ([]Standing, error) {
	query := `
		WITH team_aggregates AS (
			SELECT 
				t.id AS team_id, 
				t.name AS team_name,
				(SELECT COUNT(*) FROM participants p WHERE p.team_id = t.id) AS participant_count,
				(SELECT AVG(p.age) FROM participants p WHERE p.team_id = t.id) AS avg_age,
				COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
				COALESCE(SUM(sr.time_seconds), 0) AS total_time
			FROM teams t
			LEFT JOIN participants p ON p.team_id = t.id
			LEFT JOIN stage_results sr ON sr.participant_id = p.id
			LEFT JOIN stages s ON s.id = sr.stage_id AND s.competition_id = ?
			WHERE t.competition_id = ?
			GROUP BY t.id, t.name
		)
		SELECT 
			ta.team_id, 
			ta.team_name,
			ta.participant_count,
			ta.total_penalties, 
			ta.total_time, 
			ta.avg_age,
			CASE WHEN ta.participant_count < ? THEN 1 ELSE 0 END AS is_incomplete_team
		FROM team_aggregates ta
		ORDER BY 
			is_incomplete_team ASC,
			total_penalties ASC, 
			total_time ASC, 
			avg_age ASC
	`
	rows, err := r.db.Query(query, competitionID, competitionID, maxParticipantsPerTeam)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var standings []Standing
	rank := 1
	for rows.Next() {
		var s Standing
		if err := rows.Scan(&s.TeamID, &s.TeamName, &s.ParticipantCount, &s.TotalPenalties, &s.TotalTime, &s.AvgAge, &s.IsIncompleteTeam); err != nil {
			return nil, err
		}
		s.Rank = rank
		rank++
		standings = append(standings, s)
	}
	return standings, nil
}

func (r *Repository) GetStageStandings(competitionID int64) ([]StageStanding, error) {
	query := `
		WITH stage_team_results AS (
			SELECT s.id AS stage_id, s.name AS stage_name, s.order_index,
				t.id AS team_id, t.name AS team_name,
				COALESCE(SUM(sr.penalty_points), 0) AS total_penalties,
				COALESCE(SUM(sr.time_seconds), 0) AS total_time,
				AVG(p.age) AS avg_age
			FROM stages s
			CROSS JOIN teams t
			LEFT JOIN participants p ON p.team_id = t.id
			LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
			WHERE s.competition_id = ? AND t.competition_id = ?
			GROUP BY s.id, t.id
			ORDER BY s.order_index, total_penalties ASC, total_time ASC, avg_age ASC
		)
		SELECT * FROM stage_team_results
	`
	rows, err := r.db.Query(query, competitionID, competitionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stageMap := make(map[int64]*StageStanding)
	var stageOrder []int64

	for rows.Next() {
		var res StageTeamResult
		if err := rows.Scan(&res.StageID, &res.StageName, &res.OrderIndex, &res.TeamID, &res.TeamName, &res.TotalPenalties, &res.TotalTime, &res.AvgAge); err != nil {
			return nil, err
		}
		if _, ok := stageMap[res.StageID]; !ok {
			stageMap[res.StageID] = &StageStanding{
				StageID:    res.StageID,
				StageName:  res.StageName,
				OrderIndex: res.OrderIndex,
				Results:    []StageTeamResult{},
			}
			stageOrder = append(stageOrder, res.StageID)
		}
		res.Rank = len(stageMap[res.StageID].Results) + 1
		stageMap[res.StageID].Results = append(stageMap[res.StageID].Results, res)
	}

	result := make([]StageStanding, 0, len(stageOrder))
	for _, id := range stageOrder {
		result = append(result, *stageMap[id])
	}
	return result, nil
}

func (r *Repository) GetStageStandingsWithParticipants(competitionID int64) ([]StageStandingWithParticipants, error) {
	query := `
		WITH competition_data AS (
			SELECT 
				s.id AS stage_id, s.name AS stage_name, s.order_index,
				t.id AS team_id, t.name AS team_name,
				p.id AS participant_id, p.full_name, p.gender, p.age,
				COALESCE(sr.penalty_points, 0) AS penalty_points,
				COALESCE(sr.time_seconds, 0) AS time_seconds
			FROM stages s
			CROSS JOIN teams t
			LEFT JOIN participants p ON p.team_id = t.id
			LEFT JOIN stage_results sr ON sr.stage_id = s.id AND sr.participant_id = p.id
			WHERE s.competition_id = ? AND t.competition_id = ?
		),
		team_aggregates AS (
			SELECT 
				stage_id, stage_name, order_index, team_id, team_name,
				COALESCE(SUM(penalty_points), 0) AS team_total_penalties,
				COALESCE(SUM(time_seconds), 0) AS team_total_time,
				COUNT(participant_id) AS participant_count
			FROM competition_data
			GROUP BY stage_id, stage_name, order_index, team_id, team_name
		)
		SELECT 
			ta.stage_id, ta.stage_name, ta.order_index,
			ta.team_id, ta.team_name,
			ta.team_total_penalties, ta.team_total_time, ta.participant_count,
			cd.participant_id, cd.full_name, cd.gender, cd.age,
			cd.penalty_points, cd.time_seconds
		FROM team_aggregates ta
		LEFT JOIN competition_data cd ON cd.stage_id = ta.stage_id AND cd.team_id = ta.team_id
		ORDER BY ta.order_index, ta.team_total_penalties ASC, ta.team_total_time ASC, ta.team_name
	`
	rows, err := r.db.Query(query, competitionID, competitionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stageMap := make(map[int64]*StageStandingWithParticipants)
	var stageOrder []int64

	for rows.Next() {
		var stageID int64
		var stageName string
		var orderIndex int
		var teamID int64
		var teamName string
		var teamTotalPenalties int
		var teamTotalTime float64
		var participantCount int
		var participantID sql.NullInt64
		var fullName sql.NullString
		var gender sql.NullString
		var age sql.NullInt64
		var penaltyPoints int
		var timeSeconds float64

		if err := rows.Scan(&stageID, &stageName, &orderIndex, &teamID, &teamName, &teamTotalPenalties, &teamTotalTime, &participantCount, &participantID, &fullName, &gender, &age, &penaltyPoints, &timeSeconds); err != nil {
			return nil, err
		}

		if _, ok := stageMap[stageID]; !ok {
			stageMap[stageID] = &StageStandingWithParticipants{
				StageID:     stageID,
				StageName:   stageName,
				OrderIndex:  orderIndex,
				TeamResults: []TeamResultWithParticipants{},
			}
			stageOrder = append(stageOrder, stageID)
		}

		// Find or create team result
		var teamResult *TeamResultWithParticipants
		for i := range stageMap[stageID].TeamResults {
			if stageMap[stageID].TeamResults[i].TeamID == teamID {
				teamResult = &stageMap[stageID].TeamResults[i]
				break
			}
		}
		if teamResult == nil {
			rank := len(stageMap[stageID].TeamResults) + 1
			stageMap[stageID].TeamResults = append(stageMap[stageID].TeamResults, TeamResultWithParticipants{
				TeamID:             teamID,
				TeamName:           teamName,
				TeamTotalPenalties: teamTotalPenalties,
				TeamTotalTime:      teamTotalTime,
				ParticipantCount:   participantCount,
				Rank:               rank,
				Participants:       []ParticipantResult{},
			})
			teamResult = &stageMap[stageID].TeamResults[len(stageMap[stageID].TeamResults)-1]
		}

		if participantID.Valid && fullName.Valid {
			teamResult.Participants = append(teamResult.Participants, ParticipantResult{
				ParticipantID: participantID.Int64,
				FullName:      fullName.String,
				Gender:        gender.String,
				Age:           int(age.Int64),
				PenaltyPoints: penaltyPoints,
				TimeSeconds:   timeSeconds,
			})
		}
	}

	result := make([]StageStandingWithParticipants, 0, len(stageOrder))
	for _, id := range stageOrder {
		result = append(result, *stageMap[id])
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
		if err := rows.Scan(&d.StageID, &d.StageName, &d.OrderIndex, &d.ParticipantID, &d.FullName, &d.Gender, &d.Age, &d.TeamName, &d.PenaltyPoints, &d.TimeSeconds); err != nil {
			return nil, err
		}
		results = append(results, d)
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
		if err := rows.Scan(&p.ID, &p.TeamID, &p.FullName, &gender, &birthDate, &p.Age, &p.TeamName, &p.TimeSeconds, &p.PenaltyPoints); err != nil {
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
	return results, nil
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
