package database

import (
	"encoding/json"
	"testing"
)

func TestParticipantJSONRoundTrip(t *testing.T) {
	male := "М"
	birthDate := "2012-03-15"
	p := Participant{
		FullName:  "Новиков Роман",
		Gender:    &male,
		BirthDate: &birthDate,
		Age:       14,
	}

	b, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal participant: %v", err)
	}

	var raw map[string]any
	if err := json.Unmarshal(b, &raw); err != nil {
		t.Fatalf("unmarshal to raw map: %v", err)
	}

	if got, ok := raw["gender"].(string); !ok || got != male {
		t.Fatalf("expected gender to be string %q, got %v (type %T)", male, raw["gender"], raw["gender"])
	}
	if got, ok := raw["birth_date"].(string); !ok || got != birthDate {
		t.Fatalf("expected birth_date to be string %q, got %v (type %T)", birthDate, raw["birth_date"], raw["birth_date"])
	}

	var p2 Participant
	if err := json.Unmarshal([]byte(`{"full_name":"Иванова Анна","gender":null,"birth_date":null,"age":12}`), &p2); err != nil {
		t.Fatalf("unmarshal null gender/birth_date: %v", err)
	}
	if p2.Gender != nil || p2.BirthDate != nil {
		t.Fatalf("expected nil gender and birth_date, got gender=%v, birth_date=%v", p2.Gender, p2.BirthDate)
	}
}
