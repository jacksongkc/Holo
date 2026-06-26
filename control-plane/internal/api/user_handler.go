package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
	"github.com/Holo-VTL/Holo/control-plane/internal/repo"
	"github.com/Holo-VTL/Holo/control-plane/internal/utils/ipwhitelist"
	"github.com/Holo-VTL/Holo/control-plane/internal/utils/totp"
	"golang.org/x/crypto/bcrypt"
)

func checkPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

type UserHandler struct {
	userRepo     repo.UserRepository
	settingsRepo repo.SettingsRepository
	audit        *AuditHandler
}

func NewUserHandler(userRepo repo.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) SetSettingsRepo(settingsRepo repo.SettingsRepository) {
	h.settingsRepo = settingsRepo
}

func (h *UserHandler) SetAudit(audit *AuditHandler) {
	h.audit = audit
}

type LoginRequest struct {
	Username      string `json:"username"`
	Password      string `json:"password"`
	TwoFactorCode string `json:"twoFactorCode,omitempty"`
}

type LoginResponse struct {
	UserID            string           `json:"userId"`
	Username          string           `json:"username"`
	Role              domain.UserRole  `json:"role"`
	TwoFactorRequired bool             `json:"twoFactorRequired,omitempty"`
	TwoFactorEnabled  bool             `json:"twoFactorEnabled,omitempty"`
}

func (h *UserHandler) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	if !h.checkLoginRateLimit(w, r) {
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	ipAddress := getClientIP(r)

	user, err := h.userRepo.GetUserByUsername(r.Context(), req.Username)
	if err != nil {
		if err == domain.ErrNotFound {
			recordLoginAttempt(ipAddress, false)
			if h.audit != nil {
				h.audit.LogLoginFailed(r.Context(), req.Username, ipAddress, "username not found")
			}
			respondError(w, http.StatusUnauthorized, "invalid username or password", nil)
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to fetch user", err)
		return
	}

	if user.Status != domain.UserStatusActive {
		recordLoginAttempt(ipAddress, false)
		if h.audit != nil {
			h.audit.LogLoginFailed(r.Context(), req.Username, ipAddress, "account disabled")
		}
		respondError(w, http.StatusForbidden, "user account is disabled", nil)
		return
	}

	if !checkPasswordHash(req.Password, user.PasswordHash) {
		recordLoginAttempt(ipAddress, false)
		if h.audit != nil {
			h.audit.LogLoginFailed(r.Context(), req.Username, ipAddress, "incorrect password")
		}
		respondError(w, http.StatusUnauthorized, "invalid username or password", nil)
		return
	}

	twoFactorEnabled := false
	ipWhitelistEnabled := false
	var ipWhitelist []string
	if h.settingsRepo != nil {
		if settings, err := h.settingsRepo.GetSettings(r.Context()); err == nil {
			twoFactorEnabled = settings.Security.EnableTwoFactor
			ipWhitelistEnabled = settings.Security.EnableIPWhitelist
			ipWhitelist = settings.Security.IPWhitelist
		}
	}

	if ipWhitelistEnabled && !ipwhitelist.IsIPAllowed(ipAddress, ipWhitelist) {
		recordLoginAttempt(ipAddress, false)
		if h.audit != nil {
			h.audit.LogLoginFailed(r.Context(), req.Username, ipAddress, "ip not in whitelist")
		}
		respondError(w, http.StatusForbidden, "ip address not allowed", nil)
		return
	}

	if twoFactorEnabled && user.TwoFactorEnabled && user.TwoFactorSecret != "" {
		if req.TwoFactorCode == "" {
			response := LoginResponse{
				UserID:            user.UserID,
				Username:          user.Username,
				Role:              user.Role,
				TwoFactorRequired: true,
				TwoFactorEnabled:  true,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusAccepted)
			json.NewEncoder(w).Encode(response)
			return
		}

		if !totp.VerifyCode(user.TwoFactorSecret, req.TwoFactorCode) {
			recordLoginAttempt(ipAddress, false)
			if h.audit != nil {
				h.audit.LogLoginFailed(r.Context(), req.Username, ipAddress, "invalid two factor code")
			}
			respondError(w, http.StatusUnauthorized, "invalid two factor code", nil)
			return
		}
	}

	recordLoginAttempt(ipAddress, true)
	if h.audit != nil {
		h.audit.LogLogin(r.Context(), user.UserID, user.Username, ipAddress, "success", "")
	}

	if err := h.userRepo.UpdateLastLogin(r.Context(), user.UserID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update last login", err)
		return
	}

	response := LoginResponse{
		UserID:           user.UserID,
		Username:         user.Username,
		Role:             user.Role,
		TwoFactorEnabled: user.TwoFactorEnabled,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *UserHandler) handleListUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	users, err := h.userRepo.ListUsers(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch users", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	var req domain.CreateUserParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.Username == "" {
		respondError(w, http.StatusBadRequest, "username is required", nil)
		return
	}
	if req.Password == "" {
		respondError(w, http.StatusBadRequest, "password is required", nil)
		return
	}
	if req.Role == "" {
		req.Role = domain.UserRoleViewer
	}

	user, err := h.userRepo.CreateUser(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create user", err)
		return
	}

	if h.audit != nil {
		h.audit.LogUserCreate(r.Context(), getCurrentUserID(r), getCurrentUsername(r), user.UserID, user.Username, getClientIP(r), "success")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) handleGetMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	userID := getCurrentUserID(r)
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "unauthorized", nil)
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		if err == domain.ErrNotFound {
			respondError(w, http.StatusNotFound, "user not found", nil)
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to fetch user", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) handleGetUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/v1/users/")
	if userID == "" {
		respondError(w, http.StatusBadRequest, "user ID is required", nil)
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		if err == domain.ErrNotFound {
			respondError(w, http.StatusNotFound, "user not found", nil)
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to fetch user", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/v1/users/")
	if userID == "" {
		respondError(w, http.StatusBadRequest, "user ID is required", nil)
		return
	}

	var req domain.UpdateUserParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	user, err := h.userRepo.UpdateUser(r.Context(), userID, req)
	if err != nil {
		if err == domain.ErrNotFound {
			respondError(w, http.StatusNotFound, "user not found", nil)
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to update user", err)
		return
	}

	if h.audit != nil {
		h.audit.LogUserUpdate(r.Context(), getCurrentUserID(r), getCurrentUsername(r), user.UserID, user.Username, getClientIP(r), "success", "updated user")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/v1/users/")
	if userID == "" {
		respondError(w, http.StatusBadRequest, "user ID is required", nil)
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		if err == domain.ErrNotFound {
			respondError(w, http.StatusNotFound, "user not found", nil)
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to fetch user", err)
		return
	}

	if err := h.userRepo.DeleteUser(r.Context(), userID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete user", err)
		return
	}

	if h.audit != nil {
		h.audit.LogUserDelete(r.Context(), getCurrentUserID(r), getCurrentUsername(r), user.UserID, user.Username, getClientIP(r), "success")
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *UserHandler) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/v1/users/change-password/")
	if userID == "" {
		respondError(w, http.StatusBadRequest, "user ID is required", nil)
		return
	}

	var req struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		if err == domain.ErrNotFound {
			respondError(w, http.StatusNotFound, "user not found", nil)
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to fetch user", err)
		return
	}

	if !checkPasswordHash(req.OldPassword, user.PasswordHash) {
		respondError(w, http.StatusBadRequest, "old password is incorrect", nil)
		return
	}

	if len(req.NewPassword) < 6 {
		respondError(w, http.StatusBadRequest, "new password must be at least 6 characters", nil)
		return
	}

	params := domain.UpdateUserParams{
		Password: &req.NewPassword,
	}
	_, err = h.userRepo.UpdateUser(r.Context(), userID, params)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to change password", err)
		return
	}

	if h.audit != nil {
		h.audit.LogUserUpdate(r.Context(), user.UserID, user.Username, user.UserID, user.Username, getClientIP(r), "success", "changed password")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "password changed successfully"})
}

func (h *UserHandler) handleTwoFactorSetup(w http.ResponseWriter, r *http.Request) {
	userID := getCurrentUserID(r)
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "unauthorized", nil)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.handleGenerateTwoFactorSecret(w, r, userID)
	case http.MethodPost:
		h.handleEnableTwoFactor(w, r, userID)
	case http.MethodDelete:
		h.handleDisableTwoFactor(w, r, userID)
	default:
		respondError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
	}
}

func (h *UserHandler) handleGenerateTwoFactorSecret(w http.ResponseWriter, r *http.Request, userID string) {
	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to fetch user", err)
		return
	}

	secret, err := totp.GenerateSecret()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate secret", err)
		return
	}

	qrCodeURL := totp.GenerateQRCodeURL(secret, "Holo-VTL", user.Username)

	response := map[string]interface{}{
		"secret":      secret,
		"qrCodeUrl":   qrCodeURL,
		"enabled":     user.TwoFactorEnabled,
		"issuer":      "Holo-VTL",
		"accountName": user.Username,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

type EnableTwoFactorRequest struct {
	Secret string `json:"secret"`
	Code   string `json:"code"`
}

func (h *UserHandler) handleEnableTwoFactor(w http.ResponseWriter, r *http.Request, userID string) {
	var req EnableTwoFactorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body", err)
		return
	}

	if req.Secret == "" || req.Code == "" {
		respondError(w, http.StatusBadRequest, "secret and code are required", nil)
		return
	}

	if !totp.VerifyCode(req.Secret, req.Code) {
		respondError(w, http.StatusBadRequest, "invalid verification code", nil)
		return
	}

	if err := h.userRepo.UpdateTwoFactor(r.Context(), userID, true, req.Secret); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to enable two factor", err)
		return
	}

	if h.audit != nil {
		h.audit.LogUserUpdate(r.Context(), userID, getCurrentUsername(r), userID, getCurrentUsername(r), getClientIP(r), "success", "enabled two factor authentication")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"enabled": true})
}

func (h *UserHandler) handleDisableTwoFactor(w http.ResponseWriter, r *http.Request, userID string) {
	if err := h.userRepo.UpdateTwoFactor(r.Context(), userID, false, ""); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to disable two factor", err)
		return
	}

	if h.audit != nil {
		h.audit.LogUserUpdate(r.Context(), userID, getCurrentUsername(r), userID, getCurrentUsername(r), getClientIP(r), "success", "disabled two factor authentication")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"enabled": false})
}

func getCurrentUserID(r *http.Request) string {
	userID := r.Header.Get("X-Holo-UserID")
	return userID
}

func getCurrentUsername(r *http.Request) string {
	username := r.Header.Get("X-Holo-Username")
	if username == "" {
		return "system"
	}
	return username
}
