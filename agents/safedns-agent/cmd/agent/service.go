package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/dns"
	"github.com/kardianos/service"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func createService(a *agent) (service.Service, error) {
	svcConfig := &service.Config{
		Name:        "NebulaDNSAgent",
		DisplayName: "Nebula DNS Agent",
		Description: "Nebula DNS security agent for DNS protection",
	}

	if a == nil {
		a = &agent{}
	}

	return service.New(a, svcConfig)
}

func runAgent(asService bool) error {
	// Initialize logger
	logConfig := zap.NewProductionConfig()
	logConfig.EncoderConfig.TimeKey = "timestamp"
	logConfig.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	logger, err := logConfig.Build()
	if err != nil {
		return err
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.DefaultConfig()
	if err := cfg.Load(); err != nil {
		logger.Warn("Failed to load configuration, using defaults", zap.Error(err))
	}

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())

	a := &agent{
		config:     cfg,
		logger:     logger,
		dnsManager: dns.NewManager(),
		ctx:        ctx,
		cancel:     cancel,
	}

	if asService {
		svc, err := createService(a)
		if err != nil {
			return err
		}
		return svc.Run()
	}

	// Run in foreground
	go a.run()

	// Wait for interrupt signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	logger.Info("Received shutdown signal")
	cancel()

	// Restore DNS with retry logic (critical - user must have working DNS)
	maxRetries := 3
	retryDelays := []time.Duration{500 * time.Millisecond, 1 * time.Second, 2 * time.Second}
	var restoreErr error

	for i := 0; i < maxRetries; i++ {
		if err := a.dnsManager.Restore(); err != nil {
			restoreErr = err
			logger.Warn("Failed to restore DNS settings, retrying...",
				zap.Int("attempt", i+1),
				zap.Int("maxRetries", maxRetries),
				zap.Error(err))

			if i < maxRetries-1 {
				time.Sleep(retryDelays[i])
			}
		} else {
			logger.Info("DNS settings restored successfully")
			restoreErr = nil
			break
		}
	}

	if restoreErr != nil {
		logger.Error("Failed to restore DNS settings after all retries - user may need to manually fix DNS",
			zap.Error(restoreErr))
	}

	return nil
}
