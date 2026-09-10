package database

import (
	"testing"
)

func TestParticipantBirthDateRoundTrip(t *testing.T) {
	r := newTestRepo(t)

	comp, err := r.CreateCompetition(Competition{Name: "Тест"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}
	team, err := r.CreateTeam(comp.ID, "Команда")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}

	birthDate := "2012-03-15"
	gender := "М"
	p, err := r.CreateParticipant(team.ID, Participant{
		FullName:  "Новиков Роман",
		Gender:    &gender,
		BirthDate: &birthDate,
		Age:       0,
	})
	if err != nil {
		t.Fatalf("create participant: %v", err)
	}
	if p.BirthDate == nil || *p.BirthDate != birthDate {
		t.Fatalf("create: expected birth_date %q, got %v", birthDate, p.BirthDate)
	}
	if p.Age == 0 {
		t.Fatalf("create: expected age derived from birth date, got 0")
	}

	list, err := r.ListParticipants(team.ID)
	if err != nil {
		t.Fatalf("list participants: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 participant, got %d", len(list))
	}
	if list[0].BirthDate == nil || *list[0].BirthDate != birthDate {
		t.Fatalf("list: birth_date not round-tripped, got %v", list[0].BirthDate)
	}

	got, err := r.GetParticipantByID(p.ID)
	if err != nil || got == nil {
		t.Fatalf("get participant: %v", err)
	}
	if got.BirthDate == nil || *got.BirthDate != birthDate {
		t.Fatalf("get: birth_date not round-tripped, got %v", got.BirthDate)
	}
}

func TestParticipantAgeDerivedFromBirthDate(t *testing.T) {
	r := newTestRepo(t)

	comp, err := r.CreateCompetition(Competition{Name: "Тест"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}
	team, err := r.CreateTeam(comp.ID, "Команда")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}

	// Client-sent age must be ignored when a birth date is present.
	birthDate := "2010-01-01"
	gender := "М"
	p, err := r.CreateParticipant(team.ID, Participant{
		FullName:  "Тестов Тест",
		Gender:    &gender,
		BirthDate: &birthDate,
		Age:       99,
	})
	if err != nil {
		t.Fatalf("create participant: %v", err)
	}
	want := calcAge(birthDate)
	if p.Age != want {
		t.Fatalf("create: expected age %d derived from birth date, got %d", want, p.Age)
	}

	// Update with a new birth date re-derives the age too.
	newBirth := "2015-06-20"
	p2, err := r.UpdateParticipant(p.ID, Participant{
		FullName:  "Тестов Тест",
		Gender:    &gender,
		BirthDate: &newBirth,
		Age:       p.Age,
	})
	if err != nil {
		t.Fatalf("update participant: %v", err)
	}
	if p2.BirthDate == nil || *p2.BirthDate != newBirth {
		t.Fatalf("update: birth_date not saved, got %v", p2.BirthDate)
	}
	want2 := calcAge(newBirth)
	if p2.Age != want2 {
		t.Fatalf("update: expected age %d derived from new birth date, got %d", want2, p2.Age)
	}

	// Without a birth date the stored age is preserved.
	p3, err := r.UpdateParticipant(p.ID, Participant{
		FullName: "Тестов Тест",
		Gender:   &gender,
		Age:      7,
	})
	if err != nil {
		t.Fatalf("update participant without birth date: %v", err)
	}
	if p3.Age != 7 {
		t.Fatalf("expected preserved age 7 without birth date, got %d", p3.Age)
	}
}

func TestNormalizeBirthDate(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"2012-03-15", "2012-03-15"},
		{"2012-03-15T00:00:00Z", "2012-03-15"},
		{"", ""},
		{"garbage", "garbage"},
	}
	for _, c := range cases {
		in := c.in
		out := normalizeBirthDate(&in)
		if out == nil || *out != c.want {
			t.Fatalf("normalizeBirthDate(%q): got %v, want %q", c.in, out, c.want)
		}
	}
	if out := normalizeBirthDate(nil); out != nil {
		t.Fatalf("normalizeBirthDate(nil): expected nil, got %v", out)
	}
}

// TestParticipantBirthDateNormalizedOnLegacyDB simulates a database created
// before the column type fix, where SQLite's DATE affinity stored values as
// ISO8601 ("2012-03-15T00:00:00Z"). Reads must normalize them back.
func TestParticipantBirthDateNormalizedOnLegacyDB(t *testing.T) {
	r := newTestRepo(t)

	comp, err := r.CreateCompetition(Competition{Name: "Тест"})
	if err != nil {
		t.Fatalf("create competition: %v", err)
	}
	team, err := r.CreateTeam(comp.ID, "Команда")
	if err != nil {
		t.Fatalf("create team: %v", err)
	}

	legacy := "2012-03-15T00:00:00Z"
	if _, err := r.db.Exec(
		"INSERT INTO participants (team_id, full_name, gender, birth_date, age) VALUES (?, ?, NULL, ?, 0)",
		team.ID, "Легаси Участник", legacy,
	); err != nil {
		t.Fatalf("insert legacy participant: %v", err)
	}

	list, err := r.ListParticipants(team.ID)
	if err != nil {
		t.Fatalf("list participants: %v", err)
	}
	if len(list) != 1 || list[0].BirthDate == nil || *list[0].BirthDate != "2012-03-15" {
		t.Fatalf("expected normalized birth_date %q, got %v", "2012-03-15", list[0].BirthDate)
	}
}
