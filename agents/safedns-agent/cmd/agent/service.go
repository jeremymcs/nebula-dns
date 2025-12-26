package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/dns"
	"github.com/kardianos/service"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func createService(a *agent) (service.Service, error) {
	svcConfig := &service.Config{
		Name:        "SafeDNSAgent",
		DisplayName: "SafeDNS Agent",
		Description: "SafeDNS security agent for DNS protection",
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

	// Restore DNS
	if err := a.dnsManager.Restore(); err != nil {
		logger.Error("Failed to restore DNS settings", zap.Error(err))
	}

	return nil
}

