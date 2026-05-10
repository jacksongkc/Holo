package audit

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestJournalStore_AppendAndRead(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "holo_audit_test")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	dbPath := filepath.Join(tmpDir, "audit.jsonl")
	store, err := NewJournalStore(dbPath)
	if err != nil {
		t.Fatal(err)
	}

	evt := Event{
		EventID:    "test-1",
		Actor:      "system",
		Action:     "test",
		ObjectType: "node",
		ObjectID:   "node-1",
		Result:     "success",
		OccurredAt: time.Now().UTC(),
	}

	if err := store.Append(evt); err != nil {
		t.Fatal(err)
	}

	events, err := store.ReadAll(100)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].EventID != "test-1" {
		t.Errorf("expected EventID 'test-1', got '%s'", events[0].EventID)
	}
}

func TestJournalStore_ReadAllCountsAndLogsMalformedRows(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "audit.jsonl")
	store, err := NewJournalStore(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })

	valid := `{"eventId":"test-1","actor":"system","action":"test","objectType":"node","objectId":"node-1","result":"success","occurredAt":"2026-05-11T00:00:00Z"}` + "\n"
	if err := os.WriteFile(dbPath, []byte("{not-json}\n"+valid), 0o640); err != nil {
		t.Fatalf("write audit fixture: %v", err)
	}

	var logs bytes.Buffer
	original := log.Writer()
	log.SetOutput(&logs)
	t.Cleanup(func() { log.SetOutput(original) })

	events, err := store.ReadAll(100)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].EventID != "test-1" {
		t.Fatalf("expected one valid event after malformed row, got %+v", events)
	}
	if got := store.ParseErrors(); got != 1 {
		t.Fatalf("expected one parse error, got %d", got)
	}
	gotLog := logs.String()
	if !strings.Contains(gotLog, "line=1") || !strings.Contains(gotLog, dbPath) {
		t.Fatalf("expected parse failure log with path and line, got %q", gotLog)
	}
}
