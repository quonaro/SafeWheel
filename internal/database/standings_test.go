package database

import (
	"path/filepath"
	"testing"
)

func newTestRepo(t *testing.T) *Repository {
	t.Helper()
	db, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return NewRepository(db)
}

func addParticipants(t *testing.T, r *Repository, teamID int64, count int) []Participant {
	t.Helper()
	var res []Participant
	for i := 0; i < count; i++ {
		p, err := r.CreateParticipant(teamID, Participant{FullName: "Участник", Age: 12})
		if err != nil {
			t.Fatalf("create participant: %v", err)
		}
		res = append(res, *p)
	}
	return res
}

func TestComputeStandingsOutOfCompetition(t *testing.T) {
	r := newTestRepo(t)

	comp, err := r.CreateCompetition(Competition{Name: "Тест"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}

	stage, err := r.CreateStage(comp.ID, "Этап 1")
	if err != nil {
		t.Fatalf("create stage: %v", err)
	}
	// Этап создан, но не проводился — не должен никого дисквалифицировать.
	if _, err := r.CreateStage(comp.ID, "Этап 2"); err != nil {
		t.Fatalf("create stage 2: %v", err)
	}

	full1, _ := r.CreateTeam(comp.ID, "Полная-1")
	full2, _ := r.CreateTeam(comp.ID, "Полная-2")
	empty, _ := r.CreateTeam(comp.ID, "Пустая")
	incomplete, _ := r.CreateTeam(comp.ID, "Тройка")
	noShow, _ := r.CreateTeam(comp.ID, "Неявка")

	p1 := addParticipants(t, r, full1.ID, 4)
	p2 := addParticipants(t, r, full2.ID, 4)
	pInc := addParticipants(t, r, incomplete.ID, 3)
	addParticipants(t, r, noShow.ID, 4)

	for _, p := range p1 {
		if _, err := r.UpsertStageResult(stage.ID, p.ID, 60, 2); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}
	for _, p := range p2 {
		if _, err := r.UpsertStageResult(stage.ID, p.ID, 70, 5); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}
	for _, p := range pInc {
		if _, err := r.UpsertStageResult(stage.ID, p.ID, 50, 0); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}

	standings, err := r.ComputeStandings(comp.ID)
	if err != nil {
		t.Fatalf("compute standings: %v", err)
	}
	if len(standings) != 5 {
		t.Fatalf("expected 5 standings rows, got %d", len(standings))
	}

	byTeam := make(map[int64]OverallStanding)
	for _, s := range standings {
		byTeam[s.TeamID] = s
	}

	if s := byTeam[full1.ID]; s.OutOfCompetition || s.Rank != 1 {
		t.Fatalf("full1: expected rank 1 in competition, got %+v", s)
	}
	if s := byTeam[full1.ID]; s.FirstPlaces != 1 || s.PrizePlaceSum != 1 {
		t.Fatalf("full1: expected 1 first place and prize place sum 1, got %+v", s)
	}
	if s := byTeam[full2.ID]; s.OutOfCompetition || s.Rank != 2 {
		t.Fatalf("full2: expected rank 2 in competition, got %+v", s)
	}
	if s := byTeam[full2.ID]; s.SecondPlaces != 1 || s.PrizePlaceSum != 2 {
		t.Fatalf("full2: expected 1 second place and prize place sum 2, got %+v", s)
	}
	for _, id := range []int64{empty.ID, incomplete.ID, noShow.ID} {
		s := byTeam[id]
		if !s.OutOfCompetition || s.Rank != 0 {
			t.Fatalf("team %d: expected out of competition, got %+v", id, s)
		}
	}

	// Вне конкурса должны идти после всех конкурсных команд.
	for i := 0; i < len(standings)-1; i++ {
		if standings[i].OutOfCompetition && !standings[i+1].OutOfCompetition {
			t.Fatalf("out-of-competition team %q is above a competitive team", standings[i].TeamName)
		}
	}

	// Неполная команда с лучшим результатом не занимает место на этапе.
	stageStandings, err := r.GetStageStandings(comp.ID)
	if err != nil {
		t.Fatalf("get stage standings: %v", err)
	}
	var stage1 *StageStanding
	for i := range stageStandings {
		if stageStandings[i].StageID == stage.ID {
			stage1 = &stageStandings[i]
		}
	}
	if stage1 == nil {
		t.Fatal("stage 1 standings not found")
	}
	for _, res := range stage1.Results {
		if res.TeamID == incomplete.ID && (res.Rank != 0 || !res.OutOfCompetition) {
			t.Fatalf("incomplete team got stage rank: %+v", res)
		}
		if (res.TeamID == full1.ID || res.TeamID == full2.ID) && res.Rank == 0 {
			t.Fatalf("competitive team lost stage rank: %+v", res)
		}
	}
}
