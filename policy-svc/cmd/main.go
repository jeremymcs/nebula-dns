// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Policy Decision Service - Main Entry Point

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

	"github.com/nebuladns/policy-svc/internal/cache"
	"github.com/nebuladns/policy-svc/internal/handlers"
	"github.com/nebuladns/policy-svc/internal/policy"
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

	failMode := os.Getenv("FAIL_MODE")
	if failMode == "" {
		failMode = "open"
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

	// Initialize cache
	policyCache := cache.NewPolicyCache(redisClient, logger)

	// Initialize policy service
	policySvc := policy.NewService(policyCache, logger, failMode == "closed")

	// Initialize handlers
	h := handlers.NewHandlers(policySvc, logger)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(100 * time.Millisecond))

	// Routes
	r.Get("/health", h.Health)
	r.Post("/evaluate", h.Evaluate)
	r.Post("/auth/validate", h.ValidateToken)
	r.Post("/log", h.LogQuery)

	// Start background workers
	go policyCache.StartSubscriber(ctx)

	// Create server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sugar.Infow("Starting Nebula DNS policy service", "port", port, "failMode", failMode)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			sugar.Fatalw("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		sugar.Fatalw("Server forced to shutdown", "error", err)
	}

	sugar.Info("Server stopped")
}
