package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/Holo-VTL/Holo/control-plane/internal/audit"
)

type AuditHandler struct {
	query  *audit.QueryService
	writer audit.Writer
}

func NewAuditHandler(query *audit.QueryService, writer audit.Writer) *AuditHandler {
	return &AuditHandler{query: query, writer: writer}
}

func (h *AuditHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.handleQueryLogs(w, r)
}

func (h *AuditHandler) handleQueryLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	params := audit.QueryParams{}

	if action := r.URL.Query().Get("action"); action != "" {
		params.Action = action
	}
	if actor := r.URL.Query().Get("actor"); actor != "" {
		params.Actor = actor
	}
	if objectID := r.URL.Query().Get("objectId"); objectID != "" {
		params.ObjectID = objectID
	}
	if result := r.URL.Query().Get("result"); result != "" {
		params.Result = result
	}
	if limit := r.URL.Query().Get("limit"); limit != "" {
		if parsed, err := strconv.Atoi(limit); err == nil && parsed > 0 {
			params.Limit = parsed
		}
	}
	if cursor := r.URL.Query().Get("cursor"); cursor != "" {
		params.Cursor = cursor
	}

	result, err := h.query.Query(r.Context(), params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to query audit logs", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

func (h *AuditHandler) LogLogin(ctx context.Context, userID, username, ipAddress, result, details string) {
	if h.writer == nil {
		return
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      username,
		Action:     "login",
		ObjectType: "user",
		ObjectID:   userID,
		Result:     result,
		Details: map[string]any{
			"ipAddress": ipAddress,
			"details":   details,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func (h *AuditHandler) LogLoginFailed(ctx context.Context, username, ipAddress, reason string) {
	if h.writer == nil {
		return
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      username,
		Action:     "login_failed",
		ObjectType: "user",
		Result:     "failed",
		Details: map[string]any{
			"ipAddress": ipAddress,
			"reason":    reason,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func (h *AuditHandler) LogPasswordChange(ctx context.Context, userID, username, targetUserID, targetUsername, ipAddress, result, details string) {
	if h.writer == nil {
		return
	}
	action := "password_change"
	if userID == targetUserID {
		action = "password_change_self"
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      username,
		Action:     action,
		ObjectType: "user",
		ObjectID:   targetUserID,
		Result:     result,
		Details: map[string]any{
			"ipAddress": ipAddress,
			"details":   details,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func (h *AuditHandler) LogUserCreate(ctx context.Context, userID, username, targetUserID, targetUsername, ipAddress, result string) {
	if h.writer == nil {
		return
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      username,
		Action:     "user_create",
		ObjectType: "user",
		ObjectID:   targetUserID,
		Result:     result,
		Details: map[string]any{
			"ipAddress": ipAddress,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func (h *AuditHandler) LogUserUpdate(ctx context.Context, userID, username, targetUserID, targetUsername, ipAddress, result, details string) {
	if h.writer == nil {
		return
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      username,
		Action:     "user_update",
		ObjectType: "user",
		ObjectID:   targetUserID,
		Result:     result,
		Details: map[string]any{
			"ipAddress": ipAddress,
			"details":   details,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func (h *AuditHandler) LogUserDelete(ctx context.Context, userID, username, targetUserID, targetUsername, ipAddress, result string) {
	if h.writer == nil {
		return
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      username,
		Action:     "user_delete",
		ObjectType: "user",
		ObjectID:   targetUserID,
		Result:     result,
		Details: map[string]any{
			"ipAddress": ipAddress,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func (h *AuditHandler) LogSettingsChanged(ctx context.Context, actor, objectType, action, details string) {
	if h.writer == nil {
		return
	}
	_ = h.writer.Write(ctx, audit.Event{
		EventID:    generateAuditID(),
		Actor:      actor,
		Action:     action,
		ObjectType: objectType,
		ObjectID:   "system_settings",
		Result:     "success",
		Details: map[string]any{
			"details": details,
		},
		OccurredAt: time.Now().UTC(),
	})
}

func generateAuditID() string {
	return strconv.FormatInt(time.Now().UnixNano(), 10)
}