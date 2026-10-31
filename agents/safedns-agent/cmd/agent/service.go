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
		Name:        serviceName,
		DisplayName: "Flux Shield Agent",
		Description: "Flux Shield DNS enforcement and site IP updater",
	}

	if a == nil {
		a = &agent{}
	}

	return service.New(a, svcConfig)
}

func runAgent(asService bool) error {
	logConfig := zap.NewProductionConfig()
	logConfig.EncoderConfig.TimeKey = "timestamp"
	logConfig.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	logger, err := logConfig.Build()
	if err != nil {
		return err
	}
	defer logger.Sync()

	cfg := config.DefaultConfig()
	if err := cfg.Load(); err != nil {
		logger.Warn("Failed to load configuration, using defaults", zap.Error(err))
	}
	if err := cfg.LoadCredentials(); err != nil {
		logger.Warn("Failed to load protected credentials", zap.Error(err))
	}

	// Crash recovery: if loopback is set but we have not started the stub yet, restore first.
	guard := dns.NewManager()
	if ok, _, _ := guard.CheckEnforcement(); ok {
		logger.Warn("Loopback DNS detected at startup — restoring previous adapter DNS before continuing")
		_ = guard.RestoreFromDisk()
	}

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

	go a.run()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	logger.Info("Received shutdown signal")
	cancel()
	a.shutdownDNS()
	return nil
}

func restoreDNSWithRetry(logger *zap.Logger, mgr *dns.Manager) {
	maxRetries := 3
	retryDelays := []time.Duration{500 * time.Millisecond, 1 * time.Second, 2 * time.Second}
	for i := 0; i < maxRetries; i++ {
		if err := mgr.RestoreFromDisk(); err != nil {
			if err2 := mgr.Restore(); err2 != nil && logger != nil {
				logger.Warn("DNS restore attempt failed", zap.Int("attempt", i+1), zap.Error(err2))
			} else {
				return
			}
		} else {
			return
		}
		if i < maxRetries-1 {
			time.Sleep(retryDelays[i])
		}
	}
}
