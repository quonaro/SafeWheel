package services

import (
	"archive/zip"
	"bytes"
	"io"
	"testing"

	"safe-wheel/internal/database"
)

func TestExportCompetitionReportArchive(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)
	svc := NewExportService(repo)

	comp, err := repo.CreateCompetition(database.Competition{Name: "Конкурс"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}

	// Team with a tricky name to exercise filename sanitization.
	teamA, err := repo.CreateTeam(comp.ID, "Команда А/1")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}
	teamB, err := repo.CreateTeam(comp.ID, "Команда Б")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}

	male := "М"
	female := "Ж"
	birth := "2010-05-15"
	p1, err := repo.CreateParticipant(teamA.ID, database.Participant{FullName: "Иванов Иван", Gender: &male, BirthDate: &birth, Age: 14})
	if err != nil {
		t.Fatalf("create participant: %v", err)
	}
	p2, err := repo.CreateParticipant(teamA.ID, database.Participant{FullName: "Петрова Мария", Gender: &female, BirthDate: &birth, Age: 13})
	if err != nil {
		t.Fatalf("create participant: %v", err)
	}
	if _, err := repo.CreateParticipant(teamB.ID, database.Participant{FullName: "Сидоров Петр", Gender: &male, Age: 15}); err != nil {
		t.Fatalf("create participant: %v", err)
	}

	stage, err := repo.CreateStage(comp.ID, "Этап 1")
	if err != nil {
		t.Fatalf("create stage: %v", err)
	}
	if _, err := repo.UpsertStageResult(stage.ID, p1.ID, 12.5, 2); err != nil {
		t.Fatalf("upsert result: %v", err)
	}
	if _, err := repo.UpsertStageResult(stage.ID, p2.ID, 15.0, 0); err != nil {
		t.Fatalf("upsert result: %v", err)
	}

	data, err := svc.ExportCompetitionReportArchive(comp.ID, nil)
	if err != nil {
		t.Fatalf("export archive: %v", err)
	}

	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatalf("read zip: %v", err)
	}

	names := make([]string, 0, len(zr.File))
	for _, f := range zr.File {
		names = append(names, f.Name)
	}

	want := []string{
		"Результаты.docx",
		"Личные результаты.docx",
		"Результаты по этапам.docx",
		"Команды/Команда А_1/Команда А_1.docx",
		"Команды/Команда А_1/Иванов Иван.docx",
		"Команды/Команда А_1/Петрова Мария.docx",
		"Команды/Команда Б/Команда Б.docx",
		"Команды/Команда Б/Сидоров Петр.docx",
	}
	if len(names) != len(want) {
		t.Fatalf("expected %d files, got %d: %v", len(want), len(names), names)
	}
	for i, name := range want {
		if names[i] != name {
			t.Fatalf("file[%d] = %q, want %q (all: %v)", i, names[i], name, names)
		}
	}

	// Each file must be a valid non-empty docx (starts with PK zip magic).
	for _, f := range zr.File {
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("open %s: %v", f.Name, err)
		}
		content, err := io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			t.Fatalf("read %s: %v", f.Name, err)
		}
		if len(content) == 0 {
			t.Fatalf("file %s is empty", f.Name)
		}
		if !bytes.HasPrefix(content, []byte("PK")) {
			t.Fatalf("file %s is not a docx (missing PK header)", f.Name)
		}
	}
}

func TestExportCompetitionReportArchiveProgress(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)
	svc := NewExportService(repo)

	comp, err := repo.CreateCompetition(database.Competition{Name: "Прогресс"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}
	team, err := repo.CreateTeam(comp.ID, "Команда А")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}
	if _, err := repo.CreateParticipant(team.ID, database.Participant{FullName: "Иванов", Age: 12}); err != nil {
		t.Fatalf("create participant: %v", err)
	}
	if _, err := repo.CreateParticipant(team.ID, database.Participant{FullName: "Петров", Age: 13}); err != nil {
		t.Fatalf("create participant: %v", err)
	}

	// 3 отчёта + 1 файл команды + 2 файла участников = 6 шагов.
	var progress []struct{ current, total int }
	_, err = svc.ExportCompetitionReportArchive(comp.ID, func(message string, current, total int) {
		progress = append(progress, struct{ current, total int }{current, total})
	})
	if err != nil {
		t.Fatalf("export archive: %v", err)
	}
	if len(progress) != 6 {
		t.Fatalf("expected 6 progress steps, got %d", len(progress))
	}
	for i, p := range progress {
		if p.total != 6 {
			t.Fatalf("step %d: total = %d, want 6", i, p.total)
		}
		if p.current != i+1 {
			t.Fatalf("step %d: current = %d, want %d", i, p.current, i+1)
		}
	}
}

func TestExportCompetitionReportArchiveEmpty(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)
	svc := NewExportService(repo)

	comp, err := repo.CreateCompetition(database.Competition{Name: "Пустой"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}

	data, err := svc.ExportCompetitionReportArchive(comp.ID, nil)
	if err != nil {
		t.Fatalf("export archive: %v", err)
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatalf("read zip: %v", err)
	}
	if len(zr.File) != 3 {
		t.Fatalf("expected 3 top-level reports for empty competition, got %d: %v", len(zr.File), fileNames(zr))
	}
}

func fileNames(zr *zip.Reader) []string {
	names := make([]string, 0, len(zr.File))
	for _, f := range zr.File {
		names = append(names, f.Name)
	}
	return names
}
