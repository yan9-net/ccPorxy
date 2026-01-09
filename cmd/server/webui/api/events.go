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
			stats := h.proxy.GetStats()

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

			event := map[string]interface{}{
				"type":      "stats",
				"timestamp": time.Now().Unix(),
				"stats":     stats,
				//"currentEndpoint": currentEndpoint,
				"blacks": blacks,
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
