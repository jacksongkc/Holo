package sqlite

import (
	"context"
	"database/sql"

	"github.com/Holo-VTL/Holo/control-plane/internal/domain"
)

type sqliteAuditRepo struct {
	db *sql.DB
}

func NewAuditRepo(db *sql.DB) *sqliteAuditRepo {
	return &sqliteAuditRepo{db: db}
}

func (r *sqliteAuditRepo) Log(ctx context.Context, log domain.AuditLog) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO audit_logs (id, user_id, username, action, target_type, target_id, target_name, ip_address, result, details, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, log.ID, log.UserID, log.Username, log.Action, log.TargetType, log.TargetID, log.TargetName, log.IPAddress, log.Result, log.Details, formatTime(log.CreatedAt))
	return err
}

func (r *sqliteAuditRepo) Query(ctx context.Context, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	query := `SELECT id, user_id, username, action, target_type, target_id, target_name, ip_address, result, details, created_at FROM audit_logs WHERE 1=1`
	params := []interface{}{}

	if filter.UserID != "" {
		query += ` AND user_id = ?`
		params = append(params, filter.UserID)
	}
	if filter.Action != "" {
		query += ` AND action = ?`
		params = append(params, filter.Action)
	}
	if filter.TargetType != "" {
		query += ` AND target_type = ?`
		params = append(params, filter.TargetType)
	}
	if filter.StartDate != nil {
		query += ` AND created_at >= ?`
		params = append(params, formatTime(*filter.StartDate))
	}
	if filter.EndDate != nil {
		query += ` AND created_at <= ?`
		params = append(params, formatTime(*filter.EndDate))
	}

	query += ` ORDER BY created_at DESC`

	if filter.Limit > 0 {
		query += ` LIMIT ?`
		params = append(params, filter.Limit)
	}
	if filter.Offset > 0 {
		query += ` OFFSET ?`
		params = append(params, filter.Offset)
	}

	rows, err := r.db.QueryContext(ctx, query, params...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []domain.AuditLog
	for rows.Next() {
		var log domain.AuditLog
		var createdAt string
		if err := rows.Scan(&log.ID, &log.UserID, &log.Username, &log.Action, &log.TargetType, &log.TargetID, &log.TargetName, &log.IPAddress, &log.Result, &log.Details, &createdAt); err != nil {
			return nil, 0, err
		}
		log.CreatedAt = parseTime(createdAt)
		logs = append(logs, log)
	}

	countQuery := `SELECT COUNT(*) FROM audit_logs WHERE 1=1`
	if filter.UserID != "" {
		countQuery += ` AND user_id = ?`
	}
	if filter.Action != "" {
		countQuery += ` AND action = ?`
	}
	if filter.TargetType != "" {
		countQuery += ` AND target_type = ?`
	}
	if filter.StartDate != nil {
		countQuery += ` AND created_at >= ?`
	}
	if filter.EndDate != nil {
		countQuery += ` AND created_at <= ?`
	}

	var total int
	err = r.db.QueryRowContext(ctx, countQuery, params[:len(params)-2]...).Scan(&total)
	if err != nil && err != sql.ErrNoRows {
		return nil, 0, err
	}

	return logs, total, nil
}

func (r *sqliteAuditRepo) GetByID(ctx context.Context, id string) (*domain.AuditLog, error) {
	var log domain.AuditLog
	var createdAt string
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, username, action, target_type, target_id, target_name, ip_address, result, details, created_at
		FROM audit_logs WHERE id = ?
	`, id).Scan(&log.ID, &log.UserID, &log.Username, &log.Action, &log.TargetType, &log.TargetID, &log.TargetName, &log.IPAddress, &log.Result, &log.Details, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	log.CreatedAt = parseTime(createdAt)
	return &log, nil
}