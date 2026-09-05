package services

import (
	"bytes"
	"fmt"

	"safe-wheel/internal/database"

	docx "github.com/fumiama/go-docx"
)

type ExportService struct {
	repo *database.Repository
}

func NewExportService(repo *database.Repository) *ExportService {
	return &ExportService{repo: repo}
}

func (s *ExportService) ExportOverallResults(competitionID int64) ([]byte, error) {
	comp, err := s.repo.GetCompetitionByID(competitionID)
	if err != nil || comp == nil {
		return nil, fmt.Errorf("соревнование не найдено")
	}

	settings := database.CompetitionSettings{MaxParticipantsPerTeam: 4}

	standings, err := s.repo.ComputeStandings(competitionID, settings.MaxParticipantsPerTeam)
	if err != nil {
		return nil, err
	}

	d := docx.New()
	addTitle(d, fmt.Sprintf("%s — Общие результаты", comp.Name))
	addSubtitle(d, "Итоговая таблица результатов соревнования")

	addParagraph(d, "Место | Команда | Штрафы | Время | Участников", true)

	for _, st := range standings {
		line := fmt.Sprintf("%d | %s | %d | %s | %d",
			st.Rank, st.TeamName, st.TotalPenalties,
			database.FormatTime(st.TotalTime), st.ParticipantCount)
		addParagraph(d, line, false)
	}

	var buf bytes.Buffer
	_, err = d.WriteTo(&buf)
	if err != nil {
		return nil, fmt.Errorf("save docx: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportStageResults(competitionID int64) ([]byte, error) {
	comp, err := s.repo.GetCompetitionByID(competitionID)
	if err != nil || comp == nil {
		return nil, fmt.Errorf("соревнование не найдено")
	}

	stageStandings, err := s.repo.GetStageStandings(competitionID)
	if err != nil {
		return nil, err
	}

	d := docx.New()
	addTitle(d, fmt.Sprintf("%s — Результаты по этапам", comp.Name))

	for _, stage := range stageStandings {
		addSubtitle(d, fmt.Sprintf("Этап: %s", stage.StageName))
		addParagraph(d, "Место | Команда | Штрафы | Время", true)
		for _, res := range stage.Results {
			line := fmt.Sprintf("%d | %s | %d | %s",
				res.Rank, res.TeamName, res.TotalPenalties,
				database.FormatTime(res.TotalTime))
			addParagraph(d, line, false)
		}
		addParagraph(d, "", false)
	}

	var buf bytes.Buffer
	_, err = d.WriteTo(&buf)
	if err != nil {
		return nil, fmt.Errorf("save docx: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportAllCompetitionsResults() ([]byte, error) {
	standings, err := s.repo.GetAllCompetitionsStandings()
	if err != nil {
		return nil, err
	}

	d := docx.New()
	addTitle(d, "Общие итоги по всем соревнованиям")
	addSubtitle(d, "Сводный рейтинг команд по всем проведенным соревнованиям")

	addParagraph(d, "Место | Команда | Соревнование | Штрафы | Время", true)

	for _, st := range standings {
		line := fmt.Sprintf("%d | %s | %s | %d | %s",
			st.Rank, st.TeamName, st.CompetitionName,
			st.TotalPenalties, database.FormatTime(st.TotalTime))
		addParagraph(d, line, false)
	}

	var buf bytes.Buffer
	_, err = d.WriteTo(&buf)
	if err != nil {
		return nil, fmt.Errorf("save docx: %w", err)
	}
	return buf.Bytes(), nil
}

func addTitle(d *docx.Docx, text string) {
	p := d.AddParagraph()
	p.AddText(text).Bold().Size("32")
}

func addSubtitle(d *docx.Docx, text string) {
	p := d.AddParagraph()
	p.AddText(text).Bold().Size("24")
}

func addParagraph(d *docx.Docx, text string, bold bool) {
	p := d.AddParagraph()
	r := p.AddText(text)
	if bold {
		r.Bold().Size("22")
	} else {
		r.Size("20")
	}
}
