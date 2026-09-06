package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"safe-wheel/internal/database"
	"safe-wheel/internal/services"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx    context.Context
	repo   *database.Repository
	export *services.ExportService
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	slog.Info("app startup")

	dbPath := a.resolveDBPath()

	db, err := database.Open(dbPath)
	if err != nil {
		slog.Error("failed to open database", "path", dbPath, "error", err)
		runtime.LogErrorf(ctx, "Failed to open database: %s", err)
		return
	}

	a.repo = database.NewRepository(db)
	a.export = services.NewExportService(a.repo)
	slog.Info("app initialized")
}

func (a *App) shutdown(ctx context.Context) {
	slog.Info("app shutdown")
	if a.repo != nil {
		if err := a.repo.GetDB().Close(); err != nil {
			slog.Error("failed to close database", "error", err)
		}
	}
}

func (a *App) resolveDBPath() string {
	if envDir := os.Getenv("SAFEWHEEL_DB_DIR"); envDir != "" {
		return filepath.Join(envDir, "safewheel.db")
	}

	if exePath, err := os.Executable(); err == nil {
		return filepath.Join(filepath.Dir(exePath), "safewheel.db")
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "safewheel.db"
	}
	return filepath.Join(home, ".safewheel", "safewheel.db")
}

func (a *App) ensureRepo() error {
	if a.repo == nil {
		slog.Warn("repo not initialized")
		return fmt.Errorf("база данных не инициализирована")
	}
	return nil
}

// ===== Competitions =====

func (a *App) ListCompetitions() ([]database.Competition, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.ListCompetitions()
}

func (a *App) GetCompetitionByID(id int64) (*database.Competition, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetCompetitionByID(id)
}

func (a *App) CreateCompetition(data database.Competition) (*database.Competition, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	res, err := a.repo.CreateCompetition(data)
	if err != nil {
		slog.Error("CreateCompetition", "name", data.Name, "error", err)
		return nil, err
	}
	slog.Info("competition created", "id", res.ID, "name", res.Name)
	return res, nil
}

func (a *App) UpdateCompetition(id int64, data database.Competition) (*database.Competition, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.UpdateCompetition(id, data)
}

func (a *App) DeleteCompetition(id int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	if err := a.repo.DeleteCompetition(id); err != nil {
		slog.Error("DeleteCompetition", "id", id, "error", err)
		return err
	}
	slog.Info("competition deleted", "id", id)
	return nil
}

// ===== Teams =====

func (a *App) ListTeams(competitionID int64) ([]database.Team, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.ListTeams(competitionID)
}

func (a *App) GetTeamByID(id int64) (*database.Team, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetTeamByID(id)
}

func (a *App) CreateTeam(competitionID int64, name string) (*database.Team, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	res, err := a.repo.CreateTeam(competitionID, name)
	if err != nil {
		slog.Error("CreateTeam", "name", name, "error", err)
		return nil, err
	}
	slog.Info("team created", "id", res.ID, "name", name)
	return res, nil
}

func (a *App) UpdateTeam(id int64, name string) (*database.Team, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.UpdateTeam(id, name)
}

func (a *App) DeleteTeam(id int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	if err := a.repo.DeleteTeam(id); err != nil {
		slog.Error("DeleteTeam", "id", id, "error", err)
		return err
	}
	slog.Info("team deleted", "id", id)
	return nil
}

// ===== Participants =====

func (a *App) ListParticipants(teamID int64) ([]database.Participant, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.ListParticipants(teamID)
}

func (a *App) GetParticipantByID(id int64) (*database.Participant, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetParticipantByID(id)
}

func (a *App) CreateParticipant(teamID int64, p database.Participant) (*database.Participant, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.CreateParticipant(teamID, p)
}

func (a *App) UpdateParticipant(id int64, p database.Participant) (*database.Participant, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.UpdateParticipant(id, p)
}

func (a *App) DeleteParticipant(id int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	return a.repo.DeleteParticipant(id)
}

// ===== Stages =====

func (a *App) ListStages(competitionID int64) ([]database.Stage, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.ListStages(competitionID)
}

func (a *App) GetStageByID(id int64) (*database.Stage, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetStageByID(id)
}

func (a *App) CreateStage(competitionID int64, name string) (*database.Stage, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.CreateStage(competitionID, name)
}

func (a *App) UpdateStage(id int64, name string) (*database.Stage, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.UpdateStage(id, name)
}

func (a *App) DeleteStage(id int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	return a.repo.DeleteStage(id)
}

// ===== Results =====

func (a *App) UpsertStageResult(stageID, participantID int64, timeSeconds float64, penaltyPoints int) (*database.StageResult, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.UpsertStageResult(stageID, participantID, timeSeconds, penaltyPoints)
}

func (a *App) GetStageResults(stageID int64) ([]database.StageResult, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetStageResults(stageID)
}

// ===== Standings =====

func (a *App) ComputeStandings(competitionID int64) ([]database.OverallStanding, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.ComputeStandings(competitionID, 4)
}

func (a *App) GetStageStandings(competitionID int64) ([]database.StageStanding, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetStageStandings(competitionID)
}

func (a *App) GetStageStandingsWithParticipants(competitionID int64) ([]database.StageStandingWithParticipants, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetStageStandingsWithParticipants(competitionID)
}

func (a *App) GetIndividualStandings(competitionID int64) ([]database.IndividualStanding, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetIndividualStandings(competitionID)
}

func (a *App) GetParticipantResults(competitionID int64, participantID int64) ([]database.ParticipantStageDetail, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetParticipantResults(competitionID, participantID)
}

func (a *App) GetParticipantsWithResults(competitionID int64, stageID int64) ([]database.ParticipantWithResults, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetParticipantsWithResults(competitionID, stageID)
}

// ===== Export =====

func (a *App) ExportOverallResults(competitionID int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	data, err := a.export.ExportOverallResults(competitionID)
	if err != nil {
		return err
	}
	return a.saveFile("Общие_результаты.docx", data)
}

func (a *App) ExportStageResults(competitionID int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	data, err := a.export.ExportStageResults(competitionID)
	if err != nil {
		return err
	}
	return a.saveFile("Результаты_по_этапам.docx", data)
}

func (a *App) ExportAllCompetitionsResults() error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	data, err := a.export.ExportAllCompetitionsResults()
	if err != nil {
		return err
	}
	return a.saveFile("Общие_итоги.docx", data)
}

func (a *App) ExportIndividualStandings(competitionID int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	data, err := a.export.ExportIndividualStandings(competitionID)
	if err != nil {
		return err
	}
	return a.saveFile("Личное_первенство.docx", data)
}

func (a *App) saveFile(defaultName string, data []byte) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{DisplayName: "Word Document (*.docx)", Pattern: "*.docx"},
		},
	})
	if err != nil || path == "" {
		return nil
	}
	return os.WriteFile(path, data, 0644)
}

// ===== Statistics =====

func (a *App) GetParticipantStatistics(competitionID int64, participantID int64) (*database.ParticipantStatistics, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetParticipantStatistics(competitionID, participantID)
}

func (a *App) GetTeamStatistics(competitionID int64, teamID int64) (*database.TeamStatistics, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	return a.repo.GetTeamStatistics(competitionID, teamID)
}

func (a *App) ExportParticipantStatistics(competitionID int64, participantID int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	data, err := a.export.ExportParticipantStatistics(competitionID, participantID)
	if err != nil {
		return err
	}
	return a.saveFile("Статистика_участника.docx", data)
}

func (a *App) ExportTeamStatistics(competitionID int64, teamID int64) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	data, err := a.export.ExportTeamStatistics(competitionID, teamID)
	if err != nil {
		return err
	}
	return a.saveFile("Статистика_команды.docx", data)
}

// ===== Utility =====

func (a *App) FormatTime(seconds float64) string {
	return database.FormatTime(seconds)
}

func (a *App) ParseTimeToSeconds(timeStr string) float64 {
	return database.ParseTimeToSeconds(timeStr)
}
