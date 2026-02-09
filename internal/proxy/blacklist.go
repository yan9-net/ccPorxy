package proxy

import (
	"sync"
	"time"

	"github.com/carbe/ccNexus/internal/logger"
)

const (
	// MaxRetries 单个节点最大重试次数
	MaxRetries = 3
	// BlacklistDuration 小黑屋时长
	BlacklistDuration = 5 * time.Minute
)

// BlacklistManager 管理节点的错误状态和小黑屋
type BlacklistManager struct {
	mu sync.RWMutex
	// 记录每个节点的连续失败次数
	failureCount map[string]int
	// 记录节点进入小黑屋的时间
	blacklistedUntil map[string]time.Time
}

// NewBlacklistManager 创建一个新的黑名单管理器
func NewBlacklistManager() *BlacklistManager {
	return &BlacklistManager{
		failureCount:     make(map[string]int),
		blacklistedUntil: make(map[string]time.Time),
	}
}

// RecordFailure 记录节点失败，如果达到最大重试次数则放入小黑屋
// 返回值：是否应该放入小黑屋
func (bm *BlacklistManager) RecordFailure(endpointName string) bool {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	bm.failureCount[endpointName]++
	failCount := bm.failureCount[endpointName]

	logger.Debug("[BLACKLIST] %s 失败次数: %d/%d", endpointName, failCount, MaxRetries)

	// 如果达到最大重试次数，放入小黑屋
	if failCount >= MaxRetries {
		bm.blacklistedUntil[endpointName] = time.Now().Add(BlacklistDuration)
		bm.failureCount[endpointName] = 0 // 重置失败计数
		logger.Warn("[BLACKLIST] %s 已进入小黑屋 %v", endpointName, BlacklistDuration)
		return true
	}

	return false
}

// RecordSuccess 记录节点成功，清除失败计数
func (bm *BlacklistManager) RecordSuccess(endpointName string) {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	if bm.failureCount[endpointName] > 0 {
		logger.Debug("[BLACKLIST] %s 请求成功，清除失败计数", endpointName)
		bm.failureCount[endpointName] = 0
	}

	// 如果在小黑屋中，也移除
	if _, exists := bm.blacklistedUntil[endpointName]; exists {
		delete(bm.blacklistedUntil, endpointName)
		logger.Info("[BLACKLIST] %s 已从小黑屋移除（请求成功）", endpointName)
	}
}

// IsBlacklisted 检查节点是否在小黑屋中
func (bm *BlacklistManager) IsBlacklisted(endpointName string) bool {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	until, exists := bm.blacklistedUntil[endpointName]
	if !exists {
		return false
	}

	// 检查是否已过期
	if time.Now().After(until) {
		// 已过期，需要移除（延迟到写锁时处理）
		return false
	}

	return true
}

// CleanExpired 清理已过期的小黑屋记录
func (bm *BlacklistManager) CleanExpired() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	now := time.Now()
	for name, until := range bm.blacklistedUntil {
		if now.After(until) {
			delete(bm.blacklistedUntil, name)
			logger.Info("[BLACKLIST] %s 已从小黑屋移除（时间到期）", name)
		}
	}
}

// GetFailureCount 获取节点的失败次数
func (bm *BlacklistManager) GetFailureCount(endpointName string) int {
	bm.mu.RLock()
	defer bm.mu.RUnlock()
	return bm.failureCount[endpointName]
}

// GetBlacklistStatus 获取所有节点的黑名单状态（用于调试）
func (bm *BlacklistManager) GetBlacklistStatus() map[string]interface{} {
	bm.mu.RLock()
	defer bm.mu.RUnlock()

	status := make(map[string]interface{})
	for name, until := range bm.blacklistedUntil {
		if time.Now().Before(until) {
			status[name] = map[string]interface{}{
				"blacklisted": true,
				"until":       until.Format(time.RFC3339),
				"remaining":   int64(until.Sub(time.Now()).Seconds()),
			}
		}
	}

	for name, count := range bm.failureCount {
		if count > 0 {
			if _, exists := status[name]; !exists {
				status[name] = map[string]interface{}{
					"blacklisted":   false,
					"failure_count": count,
					"max_retries":   MaxRetries,
				}
			} else {
				status[name].(map[string]interface{})["failure_count"] = count
			}
		}
	}

	return status
}

// Reset 重置特定节点的状态
func (bm *BlacklistManager) Reset(endpointName string) {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	delete(bm.failureCount, endpointName)
	delete(bm.blacklistedUntil, endpointName)
	logger.Info("[BLACKLIST] %s 状态已重置", endpointName)
}

// ResetAll 重置所有节点的状态
func (bm *BlacklistManager) ResetAll() {
	bm.mu.Lock()
	defer bm.mu.Unlock()

	bm.failureCount = make(map[string]int)
	bm.blacklistedUntil = make(map[string]time.Time)
	logger.Info("[BLACKLIST] 所有节点状态已重置")
}
