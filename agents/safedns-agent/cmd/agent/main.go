// SafeDNS Agent - Cross-platform DNS security agent
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/dns"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/heartbeat"
	"github.com/kardianos/service"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

var (
	Version   = "0.1.0"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

type agent struct {
	config     *config.Config
	logger     *zap.Logger
	dnsManager *dns.Manager
	heartbeat  *heartbeat.Service
	ctx        context.Context
	cancel     context.CancelFunc
}

func (a *agent) Start(s service.Service) error {
	go a.run()
	return nil
}

func (a *agent) Stop(s service.Service) error {
	a.logger.Info("Stopping SafeDNS Agent")
	a.cancel()

	// Restore original DNS settings
	if err := a.dnsManager.Restore(); err != nil {
		a.logger.Error("Failed to restore DNS settings", zap.Error(err))
	}

	return nil
}

func (a *agent) run() {
	a.logger.Info("Starting SafeDNS Agent",
		zap.String("version", Version),
		zap.String("build_time", BuildTime))

	// Save original DNS configuration
	if err := a.dnsManager.SaveOriginal(); err != nil {
		a.logger.Warn("Failed to save original DNS configuration", zap.Error(err))
	}

	// Configure DNS to use SafeDNS servers
	servers := a.config.GetDNSServers()
	if err := a.dnsManager.Configure(servers); err != nil {
		a.logger.Error("Failed to configure DNS", zap.Error(err))
	} else {
		a.logger.Info("DNS configured", zap.Strings("servers", servers))
	}

	// Start heartbeat service
	hostname, _ := os.Hostname()
	a.heartbeat = heartbeat.NewService(a.config, a.logger, Version, hostname)
	go a.heartbeat.Start(a.ctx)

	// Wait for shutdown
	<-a.ctx.Done()
	a.heartbeat.Stop()
}

func main() {
	rootCmd := &cobra.Command{
		Use:   "safedns-agent",
		Short: "SafeDNS Agent - DNS security for your devices",
		Long:  `SafeDNS Agent configures your device to use SafeDNS for secure DNS resolution.`,
	}

	rootCmd.AddCommand(
		runCmd(),
		installCmd(),
		uninstallCmd(),
		statusCmd(),
		versionCmd(),
	)

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "run",
		Short: "Run the agent in foreground",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runAgent(false)
		},
	}
}

func installCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "install",
		Short: "Install the agent as a system service",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := createService(nil)
			if err != nil {
				return err
			}
			return service.Control(svc, "install")
		},
	}
}

func uninstallCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "uninstall",
		Short: "Uninstall the agent service",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := createService(nil)
			if err != nil {
				return err
			}
			return service.Control(svc, "uninstall")
		},
	}
}

func statusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Show agent status",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := createService(nil)
			if err != nil {
				return err
			}
			status, err := svc.Status()
			if err != nil {
				return err
			}
			fmt.Printf("Service status: %v\n", status)
			return nil
		},
	}
}

func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show version information",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("SafeDNS Agent v%s\n", Version)
			fmt.Printf("Build Time: %s\n", BuildTime)
			fmt.Printf("Git Commit: %s\n", GitCommit)
		},
	}
}
