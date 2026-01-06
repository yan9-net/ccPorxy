package storage

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	_ "github.com/lib/pq"
)

// safeConfigKeys 定义可以安全跨设备和跨平台备份/恢复的 app_config 配置项。
// 这些配置是平台无关的，不包含设备特定或路径相关的值。
// 不在此列表中的配置项（如 device_id、terminal_*、proxy_url 等）
// 是设备/平台特定的，不应在不同设备间同步。
var safeConfigKeys = []string{
	// 应用设置
	"port", "logLevel", "language",
	// 主题设置
	"theme", "themeAuto", "autoLightTheme", "autoDarkTheme",
	// 窗口关闭行为
	"closeWindowBehavior",
	// 更新设置
	"update_autoCheck", "update_checkInterval",
}

type PostgreSQLStorage struct {
	db      *sql.DB
	connStr string
	mu      sync.RWMutex
}

func NewPostgreSQLStorage(connStr string) (*PostgreSQLStorage, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// 测试连接
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	s := &PostgreSQLStorage{
		db:      db,
		connStr: connStr,
	}
	if err := s.initSchema(); err != nil {
		db.Close()
		return nil, err
	}

	return s, nil
}

func (s *PostgreSQLStorage) initSchema() error {
	schema := `
	CREATE TABLE IF NOT EXISTS endpoints (
		id SERIAL PRIMARY KEY,
		name TEXT UNIQUE NOT NULL,
		api_url TEXT NOT NULL,
		api_key TEXT NOT NULL,
		enabled BOOLEAN DEFAULT TRUE,
		transformer TEXT DEFAULT 'claude',
		model TEXT,
		remark TEXT,
		sort_order INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS daily_stats (
		id SERIAL PRIMARY KEY,
		endpoint_name TEXT NOT NULL,
		date TEXT NOT NULL,
		requests INTEGER DEFAULT 0,
		errors INTEGER DEFAULT 0,
		input_tokens INTEGER DEFAULT 0,
		output_tokens INTEGER DEFAULT 0,
		device_id TEXT DEFAULT 'default',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(endpoint_name, date, device_id)
	);

	CREATE TABLE IF NOT EXISTS app_config (
		key TEXT PRIMARY KEY,
		value TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
	CREATE INDEX IF NOT EXISTS idx_daily_stats_endpoint ON daily_stats(endpoint_name);
	CREATE INDEX IF NOT EXISTS idx_daily_stats_device ON daily_stats(device_id);
	`

	if _, err := s.db.Exec(schema); err != nil {
		return err
	}

	// Migration: Add sort_order column if it doesn't exist
	if err := s.migrateSortOrder(); err != nil {
		return err
	}

	return nil
}

// migrateSortOrder adds the sort_order column to existing databases
func (s *PostgreSQLStorage) migrateSortOrder() error {
	// Check if sort_order column exists
	var exists bool
	err := s.db.QueryRow(`
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_name = 'endpoints' AND column_name = 'sort_order'
		)
	`).Scan(&exists)
	if err != nil {
		return err
	}

	// If column doesn't exist, add it and set default values
	if !exists {
		// Add the column
		if _, err := s.db.Exec(`ALTER TABLE endpoints ADD COLUMN sort_order INTEGER DEFAULT 0`); err != nil {
			return err
		}

		// Set sort_order for existing endpoints based on their current ID order
		if _, err := s.db.Exec(`UPDATE endpoints SET sort_order = id WHERE sort_order = 0`); err != nil {
			return err
		}
	}

	return nil
}

func (s *PostgreSQLStorage) GetEndpoints() ([]Endpoint, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rows, err := s.db.Query(`SELECT id, name, api_url, api_key, enabled, transformer, model, remark, sort_order, created_at, updated_at FROM endpoints ORDER BY sort_order ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var endpoints []Endpoint
	for rows.Next() {
		var ep Endpoint
		if err := rows.Scan(&ep.ID, &ep.Name, &ep.APIUrl, &ep.APIKey, &ep.Enabled, &ep.Transformer, &ep.Model, &ep.Remark, &ep.SortOrder, &ep.CreatedAt, &ep.UpdatedAt); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, ep)
	}

	return endpoints, rows.Err()
}

func (s *PostgreSQLStorage) SaveEndpoint(ep *Endpoint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := s.db.QueryRow(`INSERT INTO endpoints (name, api_url, api_key, enabled, transformer, model, remark, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		ep.Name, ep.APIUrl, ep.APIKey, ep.Enabled, ep.Transformer, ep.Model, ep.Remark, ep.SortOrder).Scan(&ep.ID)
	return err
}

func (s *PostgreSQLStorage) UpdateEndpoint(ep *Endpoint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`UPDATE endpoints SET api_url=$1, api_key=$2, enabled=$3, transformer=$4, model=$5, remark=$6, sort_order=$7, updated_at=CURRENT_TIMESTAMP WHERE name=$8`,
		ep.APIUrl, ep.APIKey, ep.Enabled, ep.Transformer, ep.Model, ep.Remark, ep.SortOrder, ep.Name)
	return err
}

func (s *PostgreSQLStorage) DeleteEndpoint(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`DELETE FROM endpoints WHERE name=$1`, name)
	return err
}

func (s *PostgreSQLStorage) RecordDailyStat(stat *DailyStat) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO daily_stats (endpoint_name, date, requests, errors, input_tokens, output_tokens, device_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT(endpoint_name, date, device_id) DO UPDATE SET
			requests = daily_stats.requests + EXCLUDED.requests,
			errors = daily_stats.errors + EXCLUDED.errors,
			input_tokens = daily_stats.input_tokens + EXCLUDED.input_tokens,
			output_tokens = daily_stats.output_tokens + EXCLUDED.output_tokens
	`, stat.EndpointName, stat.Date, stat.Requests, stat.Errors, stat.InputTokens, stat.OutputTokens, stat.DeviceID)

	return err
}

func (s *PostgreSQLStorage) GetDailyStats(endpointName, startDate, endDate string) ([]DailyStat, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := `SELECT id, endpoint_name, date, SUM(requests), SUM(errors), SUM(input_tokens), SUM(output_tokens), device_id, created_at
		FROM daily_stats WHERE endpoint_name=$1 AND date>=$2 AND date<=$3 GROUP BY id, endpoint_name, date, device_id, created_at ORDER BY date DESC`

	rows, err := s.db.Query(query, endpointName, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []DailyStat
	for rows.Next() {
		var stat DailyStat
		if err := rows.Scan(&stat.ID, &stat.EndpointName, &stat.Date, &stat.Requests, &stat.Errors, &stat.InputTokens, &stat.OutputTokens, &stat.DeviceID, &stat.CreatedAt); err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}

	return stats, rows.Err()
}

func (s *PostgreSQLStorage) GetAllStats() (map[string][]DailyStat, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rows, err := s.db.Query(`SELECT id, endpoint_name, date, SUM(requests), SUM(errors), SUM(input_tokens), SUM(output_tokens), device_id, created_at
		FROM daily_stats GROUP BY id, endpoint_name, date, device_id, created_at ORDER BY date DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]DailyStat)
	for rows.Next() {
		var stat DailyStat
		if err := rows.Scan(&stat.ID, &stat.EndpointName, &stat.Date, &stat.Requests, &stat.Errors, &stat.InputTokens, &stat.OutputTokens, &stat.DeviceID, &stat.CreatedAt); err != nil {
			return nil, err
		}
		result[stat.EndpointName] = append(result[stat.EndpointName], stat)
	}

	return result, rows.Err()
}

func (s *PostgreSQLStorage) GetConfig(key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var value string
	err := s.db.QueryRow(`SELECT value FROM app_config WHERE key=$1`, key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (s *PostgreSQLStorage) SetConfig(key, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO app_config (key, value) VALUES ($1, $2)
		ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=CURRENT_TIMESTAMP
	`, key, value)
	return err
}

func (s *PostgreSQLStorage) Close() error {
	return s.db.Close()
}

func (s *PostgreSQLStorage) GetTotalStats() (int, map[string]*EndpointStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := `SELECT endpoint_name, SUM(requests), SUM(errors), SUM(input_tokens), SUM(output_tokens)
		FROM daily_stats GROUP BY endpoint_name`

	rows, err := s.db.Query(query)
	if err != nil {
		return 0, nil, err
	}
	defer rows.Close()

	result := make(map[string]*EndpointStats)
	totalRequests := 0

	for rows.Next() {
		var endpointName string
		var requests, errors int
		var inputTokens, outputTokens int64

		if err := rows.Scan(&endpointName, &requests, &errors, &inputTokens, &outputTokens); err != nil {
			return 0, nil, err
		}

		result[endpointName] = &EndpointStats{
			Requests:     requests,
			Errors:       errors,
			InputTokens:  inputTokens,
			OutputTokens: outputTokens,
		}
		totalRequests += requests
	}

	return totalRequests, result, rows.Err()
}

func (s *PostgreSQLStorage) GetEndpointTotalStats(endpointName string) (*EndpointStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := `SELECT SUM(requests), SUM(errors), SUM(input_tokens), SUM(output_tokens)
		FROM daily_stats WHERE endpoint_name=$1`

	var requests, errors int
	var inputTokens, outputTokens int64

	err := s.db.QueryRow(query, endpointName).Scan(&requests, &errors, &inputTokens, &outputTokens)
	if err == sql.ErrNoRows {
		return &EndpointStats{}, nil
	}
	if err != nil {
		return nil, err
	}

	return &EndpointStats{
		Requests:     requests,
		Errors:       errors,
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
	}, nil
}

// GetOrCreateDeviceID returns the device ID, creating one if it doesn't exist
func (s *PostgreSQLStorage) GetOrCreateDeviceID() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Try to get existing device ID
	var deviceID string
	err := s.db.QueryRow(`SELECT value FROM app_config WHERE key = 'device_id'`).Scan(&deviceID)

	if err == nil && deviceID != "" {
		return deviceID, nil
	}

	// Generate new device ID
	deviceID = generateDeviceID()

	// Save to database
	_, err = s.db.Exec(`
		INSERT INTO app_config (key, value) VALUES ('device_id', $1)
		ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value
	`, deviceID)
	if err != nil {
		return "", err
	}

	return deviceID, nil
}

func generateDeviceID() string {
	// Use timestamp + random string for uniqueness
	timestamp := time.Now().UnixNano()
	return fmt.Sprintf("device-%x", timestamp)[:16]
}

func GenerateDeviceID() string {
	return generateDeviceID()
}

// GetConnStr returns the database connection string
func (s *PostgreSQLStorage) GetConnStr() string {
	return s.connStr
}

// GetArchiveMonths returns a list of all months that have data
func (s *PostgreSQLStorage) GetArchiveMonths() ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := `SELECT DISTINCT TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') as month
		FROM daily_stats
		WHERE date IS NOT NULL AND date != ''
		ORDER BY month DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var months []string
	for rows.Next() {
		var month string
		if err := rows.Scan(&month); err != nil {
			return nil, err
		}
		months = append(months, month)
	}

	return months, rows.Err()
}

// MonthlyArchiveData represents archive data for a specific month
type MonthlyArchiveData struct {
	Month        string
	EndpointName string
	Date         string
	Requests     int
	Errors       int
	InputTokens  int
	OutputTokens int
}

// GetMonthlyArchiveData returns all daily stats for a specific month
func (s *PostgreSQLStorage) GetMonthlyArchiveData(month string) ([]MonthlyArchiveData, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := `SELECT endpoint_name, date, SUM(requests), SUM(errors), SUM(input_tokens), SUM(output_tokens)
		FROM daily_stats
		WHERE TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') = $1
		GROUP BY endpoint_name, date
		ORDER BY date DESC, endpoint_name`

	rows, err := s.db.Query(query, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []MonthlyArchiveData
	for rows.Next() {
		var data MonthlyArchiveData
		data.Month = month
		if err := rows.Scan(&data.EndpointName, &data.Date, &data.Requests, &data.Errors, &data.InputTokens, &data.OutputTokens); err != nil {
			return nil, err
		}
		results = append(results, data)
	}

	return results, rows.Err()
}

// DeleteMonthlyStats deletes all daily stats for a specific month
func (s *PostgreSQLStorage) DeleteMonthlyStats(month string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`DELETE FROM daily_stats WHERE TO_CHAR(TO_DATE(date, 'YYYY-MM-DD'), 'YYYY-MM') = $1`, month)
	return err
}

// CreateBackupCopy 创建数据库备份副本，只保留安全的 app_config 配置项。
// 设备特定的配置（device_id、终端设置、本地路径等）会被排除。
// 注意：PostgreSQL 不支持类似 SQLite 的 VACUUM INTO，此方法需要外部工具支持
func (s *PostgreSQLStorage) CreateBackupCopy(backupPath string) error {
	return fmt.Errorf("CreateBackupCopy is not implemented for PostgreSQL - use pg_dump instead")
}

// MergeConflict represents an endpoint merge conflict
type MergeConflict struct {
	EndpointName   string   `json:"endpointName"`
	ConflictFields []string `json:"conflictFields"`
	LocalEndpoint  Endpoint `json:"localEndpoint"`
	RemoteEndpoint Endpoint `json:"remoteEndpoint"`
}

// DetectEndpointConflicts detects conflicts between local and remote endpoints
// 注意：PostgreSQL 版本需要使用外部数据库连接，此方法需要重新设计
func (s *PostgreSQLStorage) DetectEndpointConflicts(remoteDBPath string) ([]MergeConflict, error) {
	return nil, fmt.Errorf("DetectEndpointConflicts is not implemented for PostgreSQL - requires separate database connection")
}

// compareEndpoints compares two endpoints and returns conflicting fields
func compareEndpoints(local, remote Endpoint) []string {
	var conflicts []string

	if local.APIUrl != remote.APIUrl {
		conflicts = append(conflicts, "apiUrl")
	}
	if local.APIKey != remote.APIKey {
		conflicts = append(conflicts, "apiKey")
	}
	if local.Enabled != remote.Enabled {
		conflicts = append(conflicts, "enabled")
	}
	if local.Transformer != remote.Transformer {
		conflicts = append(conflicts, "transformer")
	}
	if local.Model != remote.Model {
		conflicts = append(conflicts, "model")
	}
	if local.Remark != remote.Remark {
		conflicts = append(conflicts, "remark")
	}

	return conflicts
}

// MergeStrategy 定义合并时如何处理冲突
type MergeStrategy string

const (
	MergeStrategyKeepLocal      MergeStrategy = "keep_local"      // 冲突时保留本地，添加新数据
	MergeStrategyOverwriteLocal MergeStrategy = "overwrite_local" // 冲突时用备份覆盖本地
)

// MergeFromBackup 从备份数据库合并数据
// 注意：PostgreSQL 版本需要使用外部数据库连接，此方法需要重新设计
func (s *PostgreSQLStorage) MergeFromBackup(backupDBPath string, strategy MergeStrategy) error {
	return fmt.Errorf("MergeFromBackup is not implemented for PostgreSQL - requires separate database connection or pg_restore")
}
