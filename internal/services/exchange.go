package services

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"safe-wheel/internal/database"
)

type ExchangeService struct {
	repo *database.Repository
}

func NewExchangeService(repo *database.Repository) *ExchangeService {
	return &ExchangeService{repo: repo}
}

// ExportCompetitions serializes the given competitions (with teams, participants,
// stages and results) into a JSON document.
func (s *ExchangeService) ExportCompetitions(competitionIDs []int64) ([]byte, error) {
	out := database.ImportFile{
		Version:    1,
		ExportedAt: time.Now().UTC(),
	}

	for _, id := range competitionIDs {
		comp, err := s.repo.GetCompetitionByID(id)
		if err != nil {
			return nil, fmt.Errorf("соревнование %d: %w", id, err)
		}
		if comp == nil {
			return nil, fmt.Errorf("соревнование %d не найдено", id)
		}

		teams, err := s.repo.ListTeams(id)
		if err != nil {
			return nil, fmt.Errorf("команды соревнования %d: %w", id, err)
		}
		stages, err := s.repo.ListStages(id)
		if err != nil {
			return nil, fmt.Errorf("этапы соревнования %d: %w", id, err)
		}
		results, err := s.repo.ListStageResultsForCompetition(id)
		if err != nil {
			return nil, fmt.Errorf("результаты соревнования %d: %w", id, err)
		}

		// Index results by participant id for easy lookup.
		resultsByParticipant := make(map[int64][]database.StageResult)
		for _, r := range results {
			resultsByParticipant[r.ParticipantID] = append(resultsByParticipant[r.ParticipantID], r)
		}
		stageNameByID := make(map[int64]string)
		for _, st := range stages {
			stageNameByID[st.ID] = st.Name
		}

		var teamsOut []database.TeamExport
		for _, t := range teams {
			participants, err := s.repo.ListParticipants(t.ID)
			if err != nil {
				return nil, fmt.Errorf("участники команды %d: %w", t.ID, err)
			}
			var partsOut []database.ParticipantExport
			for _, p := range participants {
				pe := database.ParticipantExport{
					FullName:  p.FullName,
					Gender:    p.Gender,
					BirthDate: p.BirthDate,
					Age:       p.Age,
				}
				for _, sr := range resultsByParticipant[p.ID] {
					stageName, ok := stageNameByID[sr.StageID]
					if !ok {
						continue
					}
					pe.Results = append(pe.Results, database.ResultExport{
						StageName:     stageName,
						TimeSeconds:   sr.TimeSeconds,
						PenaltyPoints: sr.PenaltyPoints,
					})
				}
				partsOut = append(partsOut, pe)
			}
			teamsOut = append(teamsOut, database.TeamExport{
				Name:         t.Name,
				Participants: partsOut,
			})
		}

		var stagesOut []database.StageExport
		for _, st := range stages {
			stagesOut = append(stagesOut, database.StageExport{
				Name:       st.Name,
				OrderIndex: st.OrderIndex,
			})
		}

		out.Competitions = append(out.Competitions, database.CompetitionExport{
			Name:        comp.Name,
			Description: comp.Description,
			Settings:    comp.Settings,
			Teams:       teamsOut,
			Stages:      stagesOut,
		})
	}

	data, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal json: %w", err)
	}
	return data, nil
}

// ImportCompetitions creates new competitions from the given export payloads.
// Duplicate names get a " (1)", " (2)", ... suffix (like Windows file copies).
// Returns the IDs of the created competitions.
func (s *ExchangeService) ImportCompetitions(comps []database.CompetitionExport) ([]int64, error) {
	var createdIDs []int64
	for _, c := range comps {
		id, err := s.importOne(c)
		if err != nil {
			return createdIDs, fmt.Errorf("импорт соревнования %q: %w", c.Name, err)
		}
		createdIDs = append(createdIDs, id)
	}
	return createdIDs, nil
}

func (s *ExchangeService) importOne(c database.CompetitionExport) (int64, error) {
	name := s.uniqueCompetitionName(c.Name)

	comp, err := s.repo.CreateCompetition(database.Competition{
		Name:        name,
		Description: c.Description,
		Settings:    c.Settings,
	})
	if err != nil {
		return 0, fmt.Errorf("создание соревнования: %w", err)
	}
	slog.Info("import: competition created", "id", comp.ID, "name", comp.Name)

	// Stages: track id by name for result upserts.
	stageIDByName := make(map[string]int64)
	for _, st := range c.Stages {
		created, err := s.repo.CreateStage(comp.ID, st.Name)
		if err != nil {
			return comp.ID, fmt.Errorf("создание этапа %q: %w", st.Name, err)
		}
		stageIDByName[st.Name] = created.ID
	}

	// Teams + participants + results.
	for _, t := range c.Teams {
		team, err := s.repo.CreateTeam(comp.ID, t.Name)
		if err != nil {
			return comp.ID, fmt.Errorf("создание команды %q: %w", t.Name, err)
		}
		for _, p := range t.Participants {
			created, err := s.repo.CreateParticipant(team.ID, database.Participant{
				FullName:  p.FullName,
				Gender:    p.Gender,
				BirthDate: p.BirthDate,
				Age:       p.Age,
			})
			if err != nil {
				return comp.ID, fmt.Errorf("создание участника %q: %w", p.FullName, err)
			}
			for _, r := range p.Results {
				stageID, ok := stageIDByName[r.StageName]
				if !ok {
					slog.Warn("import: stage not found for result, skipping",
						"stage", r.StageName, "participant", p.FullName)
					continue
				}
				if _, err := s.repo.UpsertStageResult(stageID, created.ID, r.TimeSeconds, r.PenaltyPoints); err != nil {
					return comp.ID, fmt.Errorf("сохранение результата участника %q: %w", p.FullName, err)
				}
			}
		}
	}

	return comp.ID, nil
}

// uniqueCompetitionName returns a name that does not yet exist in the database,
// appending " (1)", " (2)", ... when the original name is taken.
func (s *ExchangeService) uniqueCompetitionName(name string) string {
	if exists, err := s.repo.CompetitionNameExists(name); err != nil || !exists {
		return name
	}
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s (%d)", name, i)
		exists, err := s.repo.CompetitionNameExists(candidate)
		if err != nil || !exists {
			return candidate
		}
	}
}
