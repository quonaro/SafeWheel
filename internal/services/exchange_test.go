package services

import (
	"encoding/json"
	"testing"

	"safe-wheel/internal/database"
)

func TestExchangeRoundTrip(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)
	exchange := NewExchangeService(repo)

	// Create source competition.
	comp, err := repo.CreateCompetition(database.Competition{Name: "Test Comp"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}

	team, err := repo.CreateTeam(comp.ID, "Team A")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}

	male := "М"
	birth := "2010-05-15"
	p, err := repo.CreateParticipant(team.ID, database.Participant{
		FullName:  "Иванов Иван",
		Gender:    &male,
		BirthDate: &birth,
		Age:       14,
	})
	if err != nil {
		t.Fatalf("create participant: %v", err)
	}

	stage, err := repo.CreateStage(comp.ID, "Stage 1")
	if err != nil {
		t.Fatalf("create stage: %v", err)
	}

	if _, err := repo.UpsertStageResult(stage.ID, p.ID, 12.5, 2); err != nil {
		t.Fatalf("upsert result: %v", err)
	}

	// Export.
	data, err := exchange.ExportCompetitions([]int64{comp.ID})
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty json")
	}

	// Import as new competition.
	var file database.ImportFile
	if err := json.Unmarshal(data, &file); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(file.Competitions) != 1 {
		t.Fatalf("expected 1 competition, got %d", len(file.Competitions))
	}

	ids, err := exchange.ImportCompetitions(file.Competitions)
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	if len(ids) != 1 {
		t.Fatalf("expected 1 imported id, got %d", len(ids))
	}
	if ids[0] == comp.ID {
		t.Fatal("imported id should be new, not original")
	}

	// Verify imported name gets a suffix because original exists.
	imported, err := repo.GetCompetitionByID(ids[0])
	if err != nil {
		t.Fatalf("get imported competition: %v", err)
	}
	if imported == nil {
		t.Fatal("imported competition not found")
	}
	if imported.Name != "Test Comp (1)" {
		t.Fatalf("expected name %q, got %q", "Test Comp (1)", imported.Name)
	}

	// Verify imported teams/participants/stages/results count.
	teams, err := repo.ListTeams(imported.ID)
	if err != nil {
		t.Fatalf("list teams: %v", err)
	}
	if len(teams) != 1 || teams[0].Name != "Team A" {
		t.Fatalf("expected 1 team Team A, got %v", teams)
	}

	participants, err := repo.ListParticipants(teams[0].ID)
	if err != nil {
		t.Fatalf("list participants: %v", err)
	}
	if len(participants) != 1 || participants[0].FullName != "Иванов Иван" {
		t.Fatalf("expected 1 participant, got %v", participants)
	}

	stages, err := repo.ListStages(imported.ID)
	if err != nil {
		t.Fatalf("list stages: %v", err)
	}
	if len(stages) != 1 || stages[0].Name != "Stage 1" {
		t.Fatalf("expected 1 stage Stage 1, got %v", stages)
	}

	results, err := repo.ListStageResultsForCompetition(imported.ID)
	if err != nil {
		t.Fatalf("list stage results: %v", err)
	}
	if len(results) != 1 || results[0].TimeSeconds != 12.5 || results[0].PenaltyPoints != 2 {
		t.Fatalf("expected 1 result, got %v", results)
	}
}

func TestUniqueCompetitionName(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)
	exchange := NewExchangeService(repo)

	if _, err := repo.CreateCompetition(database.Competition{Name: "Конкурс"}); err != nil {
		t.Fatalf("create competition: %v", err)
	}
	if _, err := repo.CreateCompetition(database.Competition{Name: "Конкурс (1)"}); err != nil {
		t.Fatalf("create competition: %v", err)
	}

	got := exchange.uniqueCompetitionName("Конкурс")
	if got != "Конкурс (2)" {
		t.Fatalf("expected %q, got %q", "Конкурс (2)", got)
	}
}

func TestCompetitionNameExists(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)
	exists, err := repo.CompetitionNameExists("Missing")
	if err != nil {
		t.Fatalf("check exists: %v", err)
	}
	if exists {
		t.Fatal("expected name to not exist")
	}

	if _, err := repo.CreateCompetition(database.Competition{Name: "Missing"}); err != nil {
		t.Fatalf("create competition: %v", err)
	}
	exists, err = repo.CompetitionNameExists("Missing")
	if err != nil {
		t.Fatalf("check exists: %v", err)
	}
	if !exists {
		t.Fatal("expected name to exist")
	}
}

func TestListStageResultsForCompetition(t *testing.T) {
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := database.NewRepository(db)

	comp, err := repo.CreateCompetition(database.Competition{Name: "Comp"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}
	team, err := repo.CreateTeam(comp.ID, "T")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}
	p, err := repo.CreateParticipant(team.ID, database.Participant{FullName: "P", Age: 10})
	if err != nil {
		t.Fatalf("create participant: %v", err)
	}
	stage, err := repo.CreateStage(comp.ID, "S")
	if err != nil {
		t.Fatalf("create stage: %v", err)
	}
	if _, err := repo.UpsertStageResult(stage.ID, p.ID, 10, 1); err != nil {
		t.Fatalf("upsert result: %v", err)
	}

	results, err := repo.ListStageResultsForCompetition(comp.ID)
	if err != nil {
		t.Fatalf("list results: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}

	// Sanity: no results for a non-existent competition.
	results, err = repo.ListStageResultsForCompetition(999)
	if err != nil {
		t.Fatalf("list results for missing comp: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected 0 results for missing comp, got %d", len(results))
	}
}
