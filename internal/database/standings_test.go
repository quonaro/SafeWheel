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
		if !s.OutOfCompetition || s.OutOfCompetitionRank == 0 || s.Rank != 2+s.OutOfCompetitionRank {
			t.Fatalf("team %d: expected out of competition with overall rank, got %+v", id, s)
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
		if res.TeamID == incomplete.ID && (res.OutOfCompetitionRank != 3 || res.Rank != 5 || !res.OutOfCompetition) {
			t.Fatalf("incomplete team expected overall stage rank 5 and group rank 3, got %+v", res)
		}
		if (res.TeamID == full1.ID || res.TeamID == full2.ID) && res.Rank == 0 {
			t.Fatalf("competitive team lost stage rank: %+v", res)
		}
	}
}

func TestComputeStandingsOutOfCompetitionRanking(t *testing.T) {
	r := newTestRepo(t)

	comp, err := r.CreateCompetition(Competition{Name: "Тест"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}

	stage1, err := r.CreateStage(comp.ID, "Этап 1")
	if err != nil {
		t.Fatalf("create stage: %v", err)
	}
	stage2, err := r.CreateStage(comp.ID, "Этап 2")
	if err != nil {
		t.Fatalf("create stage 2: %v", err)
	}

	partial, _ := r.CreateTeam(comp.ID, "Частичная")
	noShow, _ := r.CreateTeam(comp.ID, "Неявка")
	fullA, _ := r.CreateTeam(comp.ID, "Полная-А")
	fullB, _ := r.CreateTeam(comp.ID, "Полная-Б")

	partP := addParticipants(t, r, partial.ID, 4)
	noShowP := addParticipants(t, r, noShow.ID, 4)
	fullAP := addParticipants(t, r, fullA.ID, 4)
	fullBP := addParticipants(t, r, fullB.ID, 4)

	// Этап 1: "Полная-Б" не участвует.
	for _, p := range fullAP {
		if _, err := r.UpsertStageResult(stage1.ID, p.ID, 60, 2); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}
	for _, p := range partP {
		if _, err := r.UpsertStageResult(stage1.ID, p.ID, 70, 5); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}
	for _, p := range noShowP {
		if _, err := r.UpsertStageResult(stage1.ID, p.ID, 80, 1); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}

	// Этап 2: "Полная-А" пропускает этап.
	for _, p := range fullBP {
		if _, err := r.UpsertStageResult(stage2.ID, p.ID, 50, 0); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}
	for _, p := range partP {
		if _, err := r.UpsertStageResult(stage2.ID, p.ID, 55, 1); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}
	for _, p := range noShowP {
		if _, err := r.UpsertStageResult(stage2.ID, p.ID, 60, 2); err != nil {
			t.Fatalf("upsert result: %v", err)
		}
	}

	standings, err := r.ComputeStandings(comp.ID)
	if err != nil {
		t.Fatalf("compute standings: %v", err)
	}
	if len(standings) != 4 {
		t.Fatalf("expected 4 standings rows, got %d", len(standings))
	}

	// Этап 1 места: Неявка=1, Полная-А=2, Частичная=3.
	// Этап 2 места: Полная-Б=1, Частичная=2, Неявка=3.
	// Итог: Неявка 4 очка, Частичная 5 очков — конкурсные.
	// Вне конкурса: Полная-Б (1 очко) выше Полной-А (2 очка).
	if s := standings[0]; s.TeamID != noShow.ID || s.OutOfCompetition || s.Rank != 1 {
		t.Fatalf("expected noShow at rank 1, got %+v", s)
	}
	if s := standings[1]; s.TeamID != partial.ID || s.OutOfCompetition || s.Rank != 2 {
		t.Fatalf("expected partial at rank 2, got %+v", s)
	}
	if s := standings[2]; s.TeamID != fullB.ID || !s.OutOfCompetition || s.OutOfCompetitionRank != 1 || s.Rank != 3 || s.TotalPlacePoints != 1 {
		t.Fatalf("expected fullB out of competition with group rank 1 and overall rank 3, got %+v", s)
	}
	if s := standings[3]; s.TeamID != fullA.ID || !s.OutOfCompetition || s.OutOfCompetitionRank != 2 || s.Rank != 4 || s.TotalPlacePoints != 2 {
		t.Fatalf("expected fullA out of competition with group rank 2 and overall rank 4, got %+v", s)
	}

	// На этапе 2 "Полная-А" вне конкурса: общее место 4, в группе 1.
	stageStandings, err := r.GetStageStandings(comp.ID)
	if err != nil {
		t.Fatalf("get stage standings: %v", err)
	}
	var stage2Standing *StageStanding
	for i := range stageStandings {
		if stageStandings[i].StageID == stage2.ID {
			stage2Standing = &stageStandings[i]
		}
	}
	if stage2Standing == nil {
		t.Fatal("stage 2 standings not found")
	}
	for _, res := range stage2Standing.Results {
		if res.TeamID == fullA.ID && (res.OutOfCompetitionRank != 1 || res.Rank != 4 || !res.OutOfCompetition) {
			t.Fatalf("fullA: expected overall stage rank 4 and group rank 1, got %+v", res)
		}
	}
}
