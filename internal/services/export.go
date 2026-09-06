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

	standings, err := s.repo.ComputeStandings(competitionID, 4)
	if err != nil {
		return nil, err
	}

	d := docx.New().WithDefaultTheme()
	addTitle(d, fmt.Sprintf("%s — Общие результаты", comp.Name))
	addSubtitle(d, "Итоговая таблица результатов соревнования")

	header := []string{"Место", "Команда", "Сумма мест", "1-х", "2-х", "3-х"}
	rows := make([][]string, 0, len(standings))
	for _, st := range standings {
		rows = append(rows, []string{
			fmt.Sprintf("%d", st.Rank),
			st.TeamName,
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
			rows = append(rows, []string{
				fmt.Sprintf("%d", res.Rank),
				res.TeamName,
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
