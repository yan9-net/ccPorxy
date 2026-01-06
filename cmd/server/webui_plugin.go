package main

import (
	"net/http"

	"github.com/carbe/ccNexus/cmd/server/webui"
	"github.com/carbe/ccNexus/internal/config"
	"github.com/carbe/ccNexus/internal/proxy"
	"github.com/carbe/ccNexus/internal/storage"
)

// registerWebUI registers the Web UI routes
func registerWebUI(mux *http.ServeMux, cfg *config.Config, p *proxy.Proxy, storage *storage.PostgreSQLStorage) error {
	ui := webui.New(cfg, p, storage)
	return ui.RegisterRoutes(mux)
}
