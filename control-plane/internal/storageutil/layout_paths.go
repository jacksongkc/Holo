package storageutil

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type RootKind string

const (
	RootKindStorage   RootKind = "storage"
	RootKindPool      RootKind = "pool"
	RootKindBackstore RootKind = "backstore"
	RootKindConfig    RootKind = "config"
	RootKindLog       RootKind = "log"
	RootKindRun       RootKind = "run"
	RootKindData      RootKind = "data"
)

func ResolveStorageRoot() string {
	if raw := strings.TrimSpace(os.Getenv("HOLO_STORAGE_ROOT")); raw != "" {
		return raw
	}

	preferred := "/var/lib/holo/storage"
	if canWriteDir(preferred) {
		return preferred
	}

	home, err := os.UserHomeDir()
	if err == nil && strings.TrimSpace(home) != "" {
		homeRoot := filepath.Join(home, ".local", "share", "holo", "storage")
		if canWriteDir(homeRoot) {
			return homeRoot
		}
	}

	return "/tmp/holo-storage"
}

func ResolvePoolStorageBaseDir() string {
	if raw := strings.TrimSpace(os.Getenv("HOLO_STORAGE_POOL_ROOT_BASE")); raw != "" {
		return raw
	}
	return "/var/lib/holo/storage-pools"
}

func PoolStorageRoot(poolID string) string {
	return filepath.Join(ResolvePoolStorageBaseDir(), SanitizeLayoutID(poolID))
}

func SafeJoin(root, child string) (string, error) {
	root = strings.TrimSpace(root)
	child = strings.TrimSpace(child)
	if root == "" {
		return "", fmt.Errorf("storage root is required")
	}
	if child == "" {
		return filepath.Clean(root), nil
	}
	if filepath.IsAbs(child) {
		return "", fmt.Errorf("child path must be relative")
	}
	cleanRoot := filepath.Clean(root)
	candidate := filepath.Clean(filepath.Join(cleanRoot, child))
	rel, err := filepath.Rel(cleanRoot, candidate)
	if err != nil {
		return "", err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("child path escapes storage root")
	}
	return candidate, nil
}

func ValidateRoot(kind RootKind, root string) error {
	root = strings.TrimSpace(root)
	if root == "" {
		return fmt.Errorf("%s root is required", kind)
	}
	clean := filepath.Clean(root)
	if clean == "." || clean == string(filepath.Separator) {
		return fmt.Errorf("%s root is too broad", kind)
	}
	for _, denied := range []string{"/etc", "/var", "/var/lib", "/var/log", "/run", "/tmp"} {
		if clean == denied {
			return fmt.Errorf("%s root %q is too broad", kind, clean)
		}
	}
	switch kind {
	case RootKindConfig:
		if clean == "/etc/holo" {
			return nil
		}
	case RootKindLog:
		if clean == "/var/log/holo" {
			return nil
		}
	case RootKindRun:
		if clean == "/run/holo" {
			return nil
		}
	case RootKindData, RootKindStorage, RootKindPool, RootKindBackstore:
		if clean == "/var/lib/holo" || strings.HasPrefix(clean, "/var/lib/holo"+string(filepath.Separator)) {
			return nil
		}
	}
	if !filepath.IsAbs(clean) {
		return fmt.Errorf("%s root must be absolute", kind)
	}
	return nil
}

func CanonicalCartridgeLayoutDir(storageRoot, libraryID, cartridgeID string) string {
	return filepath.Join(
		strings.TrimSpace(storageRoot),
		"cartridges",
		SanitizeLayoutID(libraryID),
		SanitizeLayoutID(cartridgeID),
	)
}

func LegacyCartridgeLayoutDirs(storageRoot, cartridgeID string) ([]string, error) {
	root := strings.TrimSpace(storageRoot)
	if root == "" {
		return nil, nil
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	needle := SanitizeLayoutID(cartridgeID)
	out := make([]string, 0)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		if entry.Name() == "cartridges" {
			continue
		}
		candidate := filepath.Join(root, entry.Name(), needle)
		stat, statErr := os.Stat(candidate)
		if statErr != nil || !stat.IsDir() {
			continue
		}
		out = append(out, candidate)
	}
	return out, nil
}

func SanitizeLayoutID(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "unknown"
	}
	var b strings.Builder
	for _, ch := range raw {
		switch {
		case ch >= 'a' && ch <= 'z':
			b.WriteRune(ch)
		case ch >= 'A' && ch <= 'Z':
			b.WriteRune(ch + ('a' - 'A'))
		case ch >= '0' && ch <= '9':
			b.WriteRune(ch)
		case ch == '-' || ch == '_':
			b.WriteRune(ch)
		default:
			b.WriteByte('_')
		}
	}
	out := b.String()
	if out == "" {
		return "unknown"
	}
	return out
}

func canWriteDir(path string) bool {
	if strings.TrimSpace(path) == "" {
		return false
	}
	if err := os.MkdirAll(path, 0o755); err != nil {
		return false
	}
	probe := filepath.Join(path, ".write-probe")
	if err := os.WriteFile(probe, []byte("probe"), 0o600); err != nil {
		return false
	}
	_ = os.Remove(probe)
	return true
}
