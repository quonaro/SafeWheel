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

	standings, err := s.repo.ComputeStandings(competitionID)
	if err != nil {
		return nil, err
	}

	d := docx.New().WithDefaultTheme()
	addTitle(d, fmt.Sprintf("%s — Общие результаты", comp.Name))
	addSubtitle(d, "Итоговая таблица результатов соревнования")

	header := []string{"Место", "Команда", "Сумма мест", "1-х", "2-х", "3-х"}
	rows := make([][]string, 0, len(standings))
	for _, st := range standings {
		rank := fmt.Sprintf("%d", st.Rank)
		teamName := st.TeamName
		if st.OutOfCompetition {
			rank = "—"
			teamName += " (вне конкурса)"
		}
		rows = append(rows, []string{
			rank,
			teamName,
			fmt.Sprintf("%d", st.TotalPlacePoints),
			fmt.Sprintf("%d", st.FirstPlaces),
			fmt.Sprintf("%d", st.SecondPlaces),
			fmt.Sprintf("%d", st.ThirdPlaces),
		})
	}
	addTable(d, header, rows)

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

	d := docx.New().WithDefaultTheme()
	addTitle(d, fmt.Sprintf("%s — Результаты по этапам", comp.Name))

	for _, stage := range stageStandings {
		addSubtitle(d, fmt.Sprintf("Этап: %s", stage.StageName))
		header := []string{"Место", "Команда", "Штрафы", "Время"}
		rows := make([][]string, 0, len(stage.Results))
		for _, res := range stage.Results {
			rank := fmt.Sprintf("%d", res.Rank)
			teamName := res.TeamName
			if res.OutOfCompetition {
				rank = "—"
				teamName += " (вне конкурса)"
			}
			rows = append(rows, []string{
				rank,
				teamName,
				fmt.Sprintf("%d", res.TotalPenalties),
				database.FormatTime(res.TotalTime),
			})
		}
		addTable(d, header, rows)
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

	d := docx.New().WithDefaultTheme()
	addTitle(d, "Общие итоги по всем соревнованиям")
	addSubtitle(d, "Сводный рейтинг команд по всем проведенным соревнованиям")

	header := []string{"Место", "Команда", "Соревнование", "Штрафы", "Время"}
	rows := make([][]string, 0, len(standings))
	for _, st := range standings {
		rows = append(rows, []string{
			fmt.Sprintf("%d", st.Rank),
			st.TeamName,
			st.CompetitionName,
			fmt.Sprintf("%d", st.TotalPenalties),
			database.FormatTime(st.TotalTime),
		})
	}
	addTable(d, header, rows)

	var buf bytes.Buffer
	_, err = d.WriteTo(&buf)
	if err != nil {
		return nil, fmt.Errorf("save docx: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportIndividualStandings(competitionID int64) ([]byte, error) {
	comp, err := s.repo.GetCompetitionByID(competitionID)
	if err != nil || comp == nil {
		return nil, fmt.Errorf("соревнование не найдено")
	}

	standings, err := s.repo.GetIndividualStandings(competitionID)
	if err != nil {
		return nil, err
	}

	d := docx.New().WithDefaultTheme()
	addTitle(d, fmt.Sprintf("%s — Личное первенство", comp.Name))
	addSubtitle(d, "Результаты участников по этапам")

	for _, stage := range standings {
		addSubtitle(d, fmt.Sprintf("Этап: %s", stage.StageName))

		if len(stage.Boys) > 0 {
			addParagraph(d, "Юноши", true)
			header := []string{"Место", "ФИО", "Команда", "Штрафы", "Время"}
			rows := make([][]string, 0, len(stage.Boys))
			for _, b := range stage.Boys {
				rows = append(rows, []string{
					fmt.Sprintf("%d", b.Rank),
					b.FullName,
					b.TeamName,
					fmt.Sprintf("%d", b.PenaltyPoints),
					database.FormatTime(b.TimeSeconds),
				})
			}
			addTable(d, header, rows)
			addParagraph(d, "", false)
		}

		if len(stage.Girls) > 0 {
			addParagraph(d, "Девушки", true)
			header := []string{"Место", "ФИО", "Команда", "Штрафы", "Время"}
			rows := make([][]string, 0, len(stage.Girls))
			for _, g := range stage.Girls {
				rows = append(rows, []string{
					fmt.Sprintf("%d", g.Rank),
					g.FullName,
					g.TeamName,
					fmt.Sprintf("%d", g.PenaltyPoints),
					database.FormatTime(g.TimeSeconds),
				})
			}
			addTable(d, header, rows)
			addParagraph(d, "", false)
		}

		if len(stage.Boys) == 0 && len(stage.Girls) == 0 {
			addParagraph(d, "Нет данных", false)
			addParagraph(d, "", false)
		}
	}

	var buf bytes.Buffer
	_, err = d.WriteTo(&buf)
	if err != nil {
		return nil, fmt.Errorf("save docx: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportParticipantStatistics(competitionID int64, participantID int64) ([]byte, error) {
	comp, err := s.repo.GetCompetitionByID(competitionID)
	if err != nil || comp == nil {
		return nil, fmt.Errorf("соревнование не найдено")
	}

	stats, err := s.repo.GetParticipantStatistics(competitionID, participantID)
	if err != nil || stats == nil {
		return nil, fmt.Errorf("статистика не найдена")
	}

	d := docx.New().WithDefaultTheme()
	addTitle(d, fmt.Sprintf("%s — Статистика участника", comp.Name))
	addSubtitle(d, stats.FullName)

	addParagraph(d, fmt.Sprintf("Команда: %s", stats.TeamName), false)
	addParagraph(d, fmt.Sprintf("Возраст: %d", stats.Age), false)
	genderLabel := "—"
	switch stats.Gender {
	case "М":
		genderLabel = "Юноша"
	case "Ж":
		genderLabel = "Девушка"
	}
	addParagraph(d, fmt.Sprintf("Пол: %s", genderLabel), false)
	addParagraph(d, "", false)

	addSubtitle(d, "Результаты по этапам")
	header := []string{"Этап", "Штрафы", "Время", "Место"}
	rows := make([][]string, 0, len(stats.StageResults))
	for _, sr := range stats.StageResults {
		rankStr := "—"
		if sr.StageRank > 0 {
			rankStr = fmt.Sprintf("%d", sr.StageRank)
		}
		rows = append(rows, []string{
			sr.StageName,
			fmt.Sprintf("%d", sr.PenaltyPoints),
			database.FormatTime(sr.TimeSeconds),
			rankStr,
		})
	}
	addTable(d, header, rows)
	addParagraph(d, "", false)

	addSubtitle(d, "Итоги")
	addParagraph(d, fmt.Sprintf("Сумма штрафных: %d", stats.TotalPenalties), false)
	addParagraph(d, fmt.Sprintf("Общее время: %s", database.FormatTime(stats.TotalTime)), false)
	addParagraph(d, fmt.Sprintf("Среднее время: %s", database.FormatTime(stats.AvgTime)), false)
	if stats.BestStage != "" {
		addParagraph(d, fmt.Sprintf("Лучший этап: %s", stats.BestStage), false)
	}
	if stats.WorstStage != "" {
		addParagraph(d, fmt.Sprintf("Худший этап: %s", stats.WorstStage), false)
	}
	if stats.OverallRank > 0 {
		addParagraph(d, fmt.Sprintf("Место среди %s: %d", genderLabel, stats.OverallRank), false)
	}
	if stats.TeamRank > 0 {
		addParagraph(d, fmt.Sprintf("Место в команде: %d", stats.TeamRank), false)
	}

	var buf bytes.Buffer
	_, err = d.WriteTo(&buf)
	if err != nil {
		return nil, fmt.Errorf("save docx: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *ExportService) ExportTeamStatistics(competitionID int64, teamID int64) ([]byte, error) {
	comp, err := s.repo.GetCompetitionByID(competitionID)
	if err != nil || comp == nil {
		return nil, fmt.Errorf("соревнование не найдено")
	}

	stats, err := s.repo.GetTeamStatistics(competitionID, teamID)
	if err != nil || stats == nil {
		return nil, fmt.Errorf("статистика не найдена")
	}

	d := docx.New().WithDefaultTheme()
	addTitle(d, fmt.Sprintf("%s — Статистика команды", comp.Name))
	addSubtitle(d, stats.TeamName)

	addParagraph(d, fmt.Sprintf("Участников: %d", stats.ParticipantCount), false)
	addParagraph(d, fmt.Sprintf("Средний возраст: %.1f", stats.AvgAge), false)
	if stats.OverallRank > 0 {
		addParagraph(d, fmt.Sprintf("Место в общем зачёте: %d", stats.OverallRank), false)
	}
	addParagraph(d, "", false)

	addSubtitle(d, "Результаты по этапам")
	header := []string{"Этап", "Штрафы", "Время", "Место"}
	rows := make([][]string, 0, len(stats.StageResults))
	for _, sr := range stats.StageResults {
		rankStr := "—"
		if sr.StageRank > 0 {
			rankStr = fmt.Sprintf("%d", sr.StageRank)
		}
		rows = append(rows, []string{
			sr.StageName,
			fmt.Sprintf("%d", sr.TotalPenalties),
			database.FormatTime(sr.TotalTime),
			rankStr,
		})
	}
	addTable(d, header, rows)
	addParagraph(d, "", false)

	// Per-stage participant breakdown
	addSubtitle(d, "Результаты участников по этапам")
	for _, stage := range stats.StageResults {
		addSubtitle(d, fmt.Sprintf("Этап: %s (Итого: %d шк., %s", stage.StageName, stage.TotalPenalties, database.FormatTime(stage.TotalTime)))
		sHeader := []string{"ФИО", "Пол", "Штрафы", "Время", "Место"}
		sRows := make([][]string, 0, len(stats.Participants))
		for _, p := range stats.Participants {
			for _, psr := range p.StageResults {
				if psr.StageID != stage.StageID {
					continue
				}
				rankStr := "—"
				if psr.StageRank > 0 {
					rankStr = fmt.Sprintf("%d", psr.StageRank)
				}
				gLabel := "—"
				switch p.Gender {
				case "М":
					gLabel = "Юноша"
				case "Ж":
					gLabel = "Девушка"
				}
				sRows = append(sRows, []string{
					p.FullName,
					gLabel,
					fmt.Sprintf("%d", psr.PenaltyPoints),
					database.FormatTime(psr.TimeSeconds),
					rankStr,
				})
				break
			}
		}
		addTable(d, sHeader, sRows)
		addParagraph(d, "", false)
	}

	addSubtitle(d, "Участники команды — сводка")
	pHeader := []string{"ФИО", "Штрафы", "Время", "Место в команде"}
	pRows := make([][]string, 0, len(stats.Participants))
	for _, p := range stats.Participants {
		teamRankStr := "—"
		if p.TeamRank > 0 {
			teamRankStr = fmt.Sprintf("%d", p.TeamRank)
		}
		pRows = append(pRows, []string{
			p.FullName,
			fmt.Sprintf("%d", p.TotalPenalties),
			database.FormatTime(p.TotalTime),
			teamRankStr,
		})
	}
	addTable(d, pHeader, pRows)

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

func addTable(d *docx.Docx, header []string, rows [][]string) {
	colCount := len(header)
	rowCount := len(rows) + 1

	t := d.AddTable(rowCount, colCount, 9000, nil)

	for j, h := range header {
		p := t.TableRows[0].TableCells[j].Shade("clear", "auto", "D9D9D9").AddParagraph()
		p.Justification("center")
		p.AddText(h).Bold().Size("20")
	}

	for i, row := range rows {
		for j, cell := range row {
			if j >= colCount {
				break
			}
			p := t.TableRows[i+1].TableCells[j].AddParagraph()
			if j != 1 {
				p.Justification("center")
			}
			p.AddText(cell).Size("20")
		}
	}
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
