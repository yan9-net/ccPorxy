package webui

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/carbe/ccNexus/cmd/server/webui/api"
	"github.com/carbe/ccNexus/internal/config"
	"github.com/carbe/ccNexus/internal/proxy"
	"github.com/carbe/ccNexus/internal/storage"
)

//go:embed ui
var uiFS embed.FS

// WebUI represents the web management interface
type WebUI struct {
	apiHandler *api.Handler
}

// New creates a new WebUI instance
func New(cfg *config.Config, p *proxy.Proxy, storage *storage.PostgreSQLStorage) *WebUI {
	return &WebUI{
		apiHandler: api.NewHandler(cfg, p, storage),
	}
}

// RegisterRoutes registers all web UI routes to the provided mux
func (w *WebUI) RegisterRoutes(mux *http.ServeMux) error {
	w.apiHandler.RegisterRoutes(mux)

	uiSubFS, err := fs.Sub(uiFS, "ui")
	if err != nil {
		return err
	}

	uiHandler := http.FileServer(http.FS(uiSubFS))
	mux.Handle("/ui/", http.StripPrefix("/ui/", uiHandler))

	mux.HandleFunc("/admin", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/ui/", http.StatusFound)
	})

	return nil
}
