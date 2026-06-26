package api

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	maxFailedAttempts = 3
	blockDuration     = 15 * time.Minute
)

type LoginAttempt struct {
	FailedCount int
	LastAttempt time.Time
}

var (
	loginAttempts   = sync.Map{}
	blockedIPs      = sync.Map{}
	cleanupInterval = 30 * time.Minute
)

func init() {
	go cleanupExpiredRecords()
}

func cleanupExpiredRecords() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()

		loginAttempts.Range(func(key, value interface{}) bool {
			attempt := value.(*LoginAttempt)
			if now.Sub(attempt.LastAttempt) > blockDuration {
				loginAttempts.Delete(key)
			}
			return true
		})

		blockedIPs.Range(func(key, value interface{}) bool {
			blockTime := value.(time.Time)
			if now.Sub(blockTime) > blockDuration {
				blockedIPs.Delete(key)
			}
			return true
		})
	}
}

func getClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return strings.Split(forwarded, ",")[0]
	}

	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return xRealIP
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func isIPBlocked(ip string) bool {
	if blockedUntil, ok := blockedIPs.Load(ip); ok {
		if time.Now().Before(blockedUntil.(time.Time)) {
			return true
		}
		blockedIPs.Delete(ip)
	}
	return false
}

func recordLoginAttempt(ip string, success bool) {
	if success {
		loginAttempts.Delete(ip)
		return
	}

	value, _ := loginAttempts.LoadOrStore(ip, &LoginAttempt{})
	attempt := value.(*LoginAttempt)

	attempt.FailedCount++
	attempt.LastAttempt = time.Now()

	if attempt.FailedCount >= maxFailedAttempts {
		blockedIPs.Store(ip, time.Now().Add(blockDuration))
		loginAttempts.Delete(ip)
	}
}

func (h *UserHandler) checkLoginRateLimit(w http.ResponseWriter, r *http.Request) bool {
	ip := getClientIP(r)

	if isIPBlocked(ip) {
		respondError(w, http.StatusTooManyRequests, "too many failed login attempts, please try again later", nil)
		return false
	}

	return true
}