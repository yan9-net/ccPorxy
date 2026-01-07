package api

import (
	"net/http"

	"github.com/carbe/ccNexus/internal/config"
	"github.com/carbe/ccNexus/internal/proxy"
	"github.com/carbe/ccNexus/internal/service"
	"github.com/carbe/ccNexus/internal/storage"
)

// Handler handles API requests
type Handler struct {
	config  *config.Config
	proxy   *proxy.Proxy
	storage *storage.PostgreSQLStorage
	service *service.EndpointService
}

// NewHandler creates a new API handler
func NewHandler(cfg *config.Config, p *proxy.Proxy, s *storage.PostgreSQLStorage) *Handler {
	return &Handler{
		config:  cfg,
		proxy:   p,
		storage: s,
		service: service.NewEndpointService(cfg, p, s),
	}
}

// RegisterRoutes registers all API routes
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// Endpoint management
	mux.HandleFunc("/api/endpoints", h.handleEndpoints)
	mux.HandleFunc("/api/endpoints/", h.handleEndpointByName)
	mux.HandleFunc("/api/endpoints/current", h.handleCurrentEndpoint)
	mux.HandleFunc("/api/endpoints/switch", h.handleSwitchEndpoint)
	mux.HandleFunc("/api/endpoints/reorder", h.handleReorderEndpoints)
	mux.HandleFunc("/api/endpoints/fetch-models", h.handleFetchModels)

	// Blacklist management
	mux.HandleFunc("/api/blacklist/status", h.handleBlacklistStatus)

	// Statistics
	mux.HandleFunc("/api/stats/summary", h.handleStatsSummary)
	mux.HandleFunc("/api/stats/daily", h.handleStatsDaily)
	mux.HandleFunc("/api/stats/weekly", h.handleStatsWeekly)
	mux.HandleFunc("/api/stats/monthly", h.handleStatsMonthly)
	mux.HandleFunc("/api/stats/trends", h.handleStatsTrends)

	// Configuration
	mux.HandleFunc("/api/config", h.handleConfig)
	mux.HandleFunc("/api/config/port", h.handleConfigPort)
	mux.HandleFunc("/api/config/log-level", h.handleConfigLogLevel)

	// Real-time events
	mux.HandleFunc("/api/events", h.handleEvents)
}
