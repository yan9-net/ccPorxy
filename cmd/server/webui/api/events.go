package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/carbe/ccNexus/internal/logger"
)

// handleEvents handles Server-Sent Events for real-time updates
func (h *Handler) handleEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create a flusher
	flusher, ok := w.(http.Flusher)
	if !ok {
		WriteError(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	// Send initial connection message
	fmt.Fprintf(w, "data: {\"type\":\"connected\",\"message\":\"Connected to ccNexus events\"}\n\n")
	flusher.Flush()

	// Create ticker for periodic updates
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Listen for client disconnect
	ctx := r.Context()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Send stats update
			totalRequests, endpointStats := h.proxy.GetStats().GetStats()

			// Calculate totals
			totalErrors := 0
			var totalInputTokens int64 = 0
			var totalOutputTokens int64 = 0

			for _, stats := range endpointStats {
				totalErrors += stats.Errors
				totalInputTokens += int64(stats.InputTokens)
				totalOutputTokens += int64(stats.OutputTokens)
			}

			// Get current endpoint
			//endpoints := h.config.GetEndpoints()
			//var currentEndpoint string
			//if len(endpoints) > 0 {
			//	for _, ep := range endpoints {
			//		if ep.Enabled {
			//			currentEndpoint = ep.Name
			//			break
			//		}
			//	}
			//}

			blacks := h.proxy.GetBlacklistStatus()

			today := time.Now().Format("2006-01-02")
			yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
			todayStats, err := h.getStatsForPeriod(today, today)
			yesterdayStats, err := h.getStatsForPeriod(yesterday, yesterday)
			// Calculate changes
			daily := map[string]interface{}{
				"todayVsYesterday": map[string]interface{}{
					"requests": map[string]interface{}{
						"today":     todayStats["totalRequests"],
						"yesterday": yesterdayStats["totalRequests"],
						"change":    calculatePercentChange(yesterdayStats["totalRequests"].(int), todayStats["totalRequests"].(int)),
					},
					"errors": map[string]interface{}{
						"today":     todayStats["totalErrors"],
						"yesterday": yesterdayStats["totalErrors"],
						"change":    calculatePercentChange(yesterdayStats["totalErrors"].(int), todayStats["totalErrors"].(int)),
					},
					"inputTokens": map[string]interface{}{
						"today":     todayStats["totalInputTokens"],
						"yesterday": yesterdayStats["totalInputTokens"],
						"change":    calculatePercentChange(int(yesterdayStats["totalInputTokens"].(int64)), int(todayStats["totalInputTokens"].(int64))),
					},
					"outputTokens": map[string]interface{}{
						"today":     todayStats["totalOutputTokens"],
						"yesterday": yesterdayStats["totalOutputTokens"],
						"change":    calculatePercentChange(int(yesterdayStats["totalOutputTokens"].(int64)), int(todayStats["totalOutputTokens"].(int64))),
					},
				},
			}

			event := map[string]interface{}{
				"type":      "stats",
				"timestamp": time.Now().Unix(),
				"stats": map[string]interface{}{
					"TotalRequests":     totalRequests,
					"TotalErrors":       totalErrors,
					"TotalInputTokens":  totalInputTokens,
					"TotalOutputTokens": totalOutputTokens,
					"Endpoints":         endpointStats,
				},
				//"currentEndpoint": currentEndpoint,
				"blacks": blacks,
				"daily":  daily,
			}

			data, err := json.Marshal(event)
			if err != nil {
				logger.Error("[SSE] Failed to marshal event: %v", err)
				continue
			}

			// Send event
			fmt.Fprintf(w, "data: %s\n\n", string(data))
			flusher.Flush()
		}
	}
}
