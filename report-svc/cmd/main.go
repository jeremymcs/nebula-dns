// Nebula DNS - Report Worker Service - Main Entry Point
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/nebuladns/report-svc/internal/clickhouse"
	"github.com/nebuladns/report-svc/internal/handlers"
	"github.com/nebuladns/report-svc/internal/metrics"
	"github.com/nebuladns/report-svc/internal/queue"
	"github.com/nebuladns/report-svc/internal/reports"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	if os.Getenv("LOG_LEVEL") == "debug" {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()

	sugar := logger.Sugar()

	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis:6379"
	}

	clickhouseURL := os.Getenv("CLICKHOUSE_URL")
	if clickhouseURL == "" {
		clickhouseURL = "http://clickhouse:8123"
	}

	clickhouseDB := os.Getenv("CLICKHOUSE_DATABASE")
	if clickhouseDB == "" {
		clickhouseDB = "nebula_dns"
	}

	clickhouseUser := os.Getenv("CLICKHOUSE_USER")
	clickhousePassword := os.Getenv("CLICKHOUSE_PASSWORD")

	// Request timeout (default 60s for report generation)
	requestTimeout := 60 * time.Second
	if timeout := os.Getenv("REQUEST_TIMEOUT_MS"); timeout != "" {
		if ms, err := time.ParseDuration(timeout + "ms"); err == nil {
			requestTimeout = ms
		}
	}

	// Initialize Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		sugar.Warnw("Failed to connect to Redis", "error", err)
	} else {
		sugar.Info("Connected to Redis")
	}

	// Initialize Prometheus metrics
	m := metrics.NewMetrics()
	sugar.Info("Prometheus metrics initialized")

	// Initialize ClickHouse client
	chClient := clickhouse.NewClient(clickhouseURL, clickhouseDB, clickhouseUser, clickhousePassword, logger)
	defer chClient.Close()
	sugar.Infow("ClickHouse client initialized", "url", clickhouseURL, "database", clickhouseDB)

	// Initialize report service
	reportService := reports.NewService(chClient, m, logger)

	// Initialize job consumer
	consumer := queue.NewConsumer(redisClient, reportService, m, logger)

	// Initialize handlers
	h := handlers.NewHandlers(reportService, consumer, chClient, m, logger)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(requestTimeout))

	// Routes
	r.Get("/health", h.Health)
	r.Get("/ready", h.Ready)
	r.Get("/live", h.Live)
	r.Get("/metrics", h.Metrics)
	r.Get("/stats", h.Stats)
	r.Post("/generate", h.GenerateReport)
	r.Get("/report", h.GetReport)

	// Create cancellable context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start job consumer in background
	go func() {
		if err := consumer.Start(ctx); err != nil && err != context.Canceled {
			sugar.Errorw("Job consumer error", "error", err)
		}
	}()

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 120 * time.Second, // Longer for report generation
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sugar.Infow("Starting Nebula DNS report service", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("Shutting down server...")

	// Cancel context to stop consumer
	cancel()

	// Stop consumer gracefully
	consumer.Stop()

	// Shutdown server
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		sugar.Fatalw("Server forced to shutdown", "error", err)
	}

	sugar.Info("Server stopped")
}
