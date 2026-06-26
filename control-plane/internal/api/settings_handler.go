package api

import (
	"encoding/json"
	"net/http"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
	"github.com/Holo-VTL/Holo/control-plane/internal/repo"
)

type SettingsHandler struct {
	settingsRepo repo.SettingsRepository
	audit        *AuditHandler
}

func NewSettingsHandler(settingsRepo repo.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{settingsRepo: settingsRepo}
}

func (h *SettingsHandler) SetAudit(audit *AuditHandler) {
	h.audit = audit
}

func (h *SettingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.handleGetSettings(w, r)
	case http.MethodPut:
		h.handleSaveSettings(w, r)
	default:
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
	}
}

func (h *SettingsHandler) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsRepo.GetSettings(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get settings", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(settings)
}

func (h *SettingsHandler) handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var settings domain.SystemSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if err := h.settingsRepo.SaveSettings(r.Context(), &settings); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save settings", err)
		return
	}

	if h.audit != nil {
		h.audit.LogSettingsChanged(r.Context(), getCurrentUser(r), "system", "updated", "settings updated")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(settings)
}
