package main

import (
	"errors"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"strconv"
	"syscall"

	"github.com/carbe/ccNexus/internal/config"
	"github.com/carbe/ccNexus/internal/logger"
	"github.com/carbe/ccNexus/internal/proxy"
	"github.com/carbe/ccNexus/internal/storage"
)

func main() {
	connStr := os.Getenv("CCNEXUS_DB_CONNSTR")
	if connStr == "" {
		logger.Info("Failed to findPostgreSQL connection string")
		os.Exit(1)
	}

	pgStorage, err := storage.NewPostgreSQLStorage(connStr)
	if err != nil {
		logger.Error("Failed to open PostgreSQL storage: %v", err)
		os.Exit(1)
	}
	defer pgStorage.Close()

	cfg, err := loadConfig(pgStorage)
	if err != nil {
		logger.Error("Unable to load configuration: %v", err)
		os.Exit(1)
	}

	applyEnvOverrides(cfg)
	setLogLevels(cfg.GetLogLevel())

	if err := cfg.Validate(); err != nil {
		logger.Error("Invalid configuration: %v", err)
		os.Exit(1)
	}

	deviceID, err := pgStorage.GetOrCreateDeviceID()
	if err != nil {
		logger.Warn("Failed to get device ID: %v, using default", err)
		deviceID = "default"
	}

	statsAdapter := storage.NewStatsStorageAdapter(pgStorage)
	p := proxy.New(cfg, statsAdapter, deviceID)

	// Create HTTP mux
	mux := http.NewServeMux()

	// Initialize and register Web UI (optional plugin)
	// If webui package is not available, this will be skipped at compile time
	if err := registerWebUI(mux, cfg, p, pgStorage); err != nil {
		logger.Warn("Web UI not available: %v", err)
	} else {
		logger.Info("Web UI available at /ui/")
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- p.StartWithMux(mux)
	}()

	logger.Info("ccNexus headless API listening on :%d (connStr: [hidden])", cfg.GetPort())

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		logger.Info("Received signal %s, shutting down", sig.String())
		if err := p.Stop(); err != nil {
			logger.Warn("Graceful shutdown failed: %v", err)
		}
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("Proxy server stopped with error: %v", err)
			os.Exit(1)
		}
	}

	logger.Info("ccNexus stopped")
}

func loadConfig(pgStorage *storage.PostgreSQLStorage) (*config.Config, error) {
	adapter := storage.NewConfigStorageAdapter(pgStorage)
	cfg, err := config.LoadFromStorage(adapter)
	if err != nil {
		logger.Warn("Failed to load config from storage, using default: %v", err)
		cfg = config.DefaultConfig()
		if saveErr := cfg.SaveToStorage(adapter); saveErr != nil {
			logger.Warn("Failed to persist default config: %v", saveErr)
		}
	}

	// Seed a default endpoint when none are configured to avoid boot failure
	if len(cfg.Endpoints) == 0 {
		logger.Warn("No endpoints found; seeding a default endpoint")

		cfg.Endpoints = config.DefaultConfig().Endpoints
		//config.Endpoints 根据Priority从小到大排序
		sort.Slice(cfg.Endpoints, func(i, j int) bool {
			return cfg.Endpoints[i].Priority < cfg.Endpoints[j].Priority
		})

		if saveErr := cfg.SaveToStorage(adapter); saveErr != nil {
			logger.Warn("Failed to persist seeded endpoint: %v", saveErr)
		}
	}
	return cfg, nil
}

func applyEnvOverrides(cfg *config.Config) {
	if portStr := os.Getenv("CCNEXUS_PORT"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil {
			cfg.UpdatePort(port)
		} else {
			logger.Warn("Invalid CCNEXUS_PORT value %q: %v", portStr, err)
		}
	}

	if levelStr := os.Getenv("CCNEXUS_LOG_LEVEL"); levelStr != "" {
		if level, err := strconv.Atoi(levelStr); err == nil {
			cfg.UpdateLogLevel(level)
		} else {
			logger.Warn("Invalid CCNEXUS_LOG_LEVEL value %q: %v", levelStr, err)
		}
	}
}

func setLogLevels(level int) {
	if level < 0 {
		return
	}
	logger.GetLogger().SetMinLevel(logger.LogLevel(level))
	logger.GetLogger().SetConsoleLevel(logger.LogLevel(level))
}
