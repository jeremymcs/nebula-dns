// Nebula DNS Agent - Cross-platform DNS security agent
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/dns"
	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/forwarder"
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
	forwarder  *forwarder.Forwarder
	ctx        context.Context
	cancel     context.CancelFunc
}

func (a *agent) Start(s service.Service) error {
	go a.run()
	return nil
}

func (a *agent) Stop(s service.Service) error {
	a.logger.Info("Stopping Nebula DNS Agent")
	a.cancel()

	// Stop forwarder if running
	if a.forwarder != nil && a.forwarder.IsRunning() {
		if err := a.forwarder.Stop(); err != nil {
			a.logger.Error("Failed to stop forwarder", zap.Error(err))
		}
	}

	// Restore original DNS settings
	if err := a.dnsManager.Restore(); err != nil {
		a.logger.Error("Failed to restore DNS settings", zap.Error(err))
	}

	return nil
}

func (a *agent) run() {
	a.logger.Info("Starting Nebula DNS Agent",
		zap.String("version", Version),
		zap.String("build_time", BuildTime))

	// DNS enforcement uses the local stub forwarder (split DNS for AD) by default on Windows.
	useForwarder := a.config.Forwarder.Enabled || a.configHasRole("dns-enforce")
	if useForwarder {
		a.config.Forwarder.Enabled = true
		a.logger.Info("DNS enforcement via local stub forwarder",
			zap.String("listen_address", a.config.Forwarder.ListenAddress),
			zap.Int("internal_zones", len(a.config.Forwarder.InternalZones)))

		a.forwarder = forwarder.New(a.config, a.logger)
		if err := a.forwarder.Start(); err != nil {
			a.logger.Error("Failed to start forwarder", zap.Error(err))
		} else {
			if err := a.dnsManager.SaveOriginal(); err != nil {
				a.logger.Warn("Failed to save original DNS configuration", zap.Error(err))
			}
			if err := a.dnsManager.Configure([]string{"127.0.0.1"}); err != nil {
				a.logger.Error("Failed to configure DNS to use local forwarder", zap.Error(err))
			}
		}
	} else if a.configHasRole("site-updater") {
		a.logger.Info("Site updater role only — skipping DNS enforcement")
	} else {
		// Standard mode: point DNS directly to Nebula DNS servers
		if err := a.dnsManager.SaveOriginal(); err != nil {
			a.logger.Warn("Failed to save original DNS configuration", zap.Error(err))
		}

		servers := a.config.GetDNSServers()
		if err := a.dnsManager.Configure(servers); err != nil {
			a.logger.Error("Failed to configure DNS", zap.Error(err))
		} else {
			a.logger.Info("DNS configured", zap.Strings("servers", servers))
		}
	}

	// Start heartbeat service
	hostname, _ := os.Hostname()
	a.heartbeat = heartbeat.NewService(a.config, a.logger, Version, hostname)
	go a.heartbeat.Start(a.ctx)

	// Wait for shutdown
	<-a.ctx.Done()
	a.heartbeat.Stop()

	// Stop forwarder if running
	if a.forwarder != nil && a.forwarder.IsRunning() {
		if err := a.forwarder.Stop(); err != nil {
			a.logger.Error("Failed to stop forwarder", zap.Error(err))
		}
	}
}

func (a *agent) configHasRole(role string) bool {
	for _, r := range a.config.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func main() {
	rootCmd := &cobra.Command{
		Use:   "nebuladns-agent",
		Short: "Nebula DNS Agent - DNS security for your devices",
		Long:  `Nebula DNS Agent configures your device to use Nebula DNS for secure DNS resolution.`,
	}

	rootCmd.AddCommand(
		runCmd(),
		installCmd(),
		uninstallCmd(),
		statusCmd(),
		versionCmd(),
		configCmd(),
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
			fmt.Printf("Nebula DNS Agent v%s\n", Version)
			fmt.Printf("Build Time: %s\n", BuildTime)
			fmt.Printf("Git Commit: %s\n", GitCommit)
		},
	}
}

func configCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Configuration management commands",
	}

	// Enable forwarder mode
	enableForwarder := &cobra.Command{
		Use:   "enable-forwarder",
		Short: "Enable DNS forwarder mode with split-DNS support",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg := config.DefaultConfig()
			if err := cfg.Load(); err != nil {
				return err
			}
			cfg.Forwarder.Enabled = true
			if err := cfg.Save(); err != nil {
				return err
			}
			fmt.Println("Forwarder mode enabled. Restart the agent for changes to take effect.")
			return nil
		},
	}

	// Disable forwarder mode
	disableForwarder := &cobra.Command{
		Use:   "disable-forwarder",
		Short: "Disable DNS forwarder mode",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg := config.DefaultConfig()
			if err := cfg.Load(); err != nil {
				return err
			}
			cfg.Forwarder.Enabled = false
			if err := cfg.Save(); err != nil {
				return err
			}
			fmt.Println("Forwarder mode disabled. Restart the agent for changes to take effect.")
			return nil
		},
	}

	// Add internal domain
	addDomain := &cobra.Command{
		Use:   "add-internal-domain [domain] [dns-servers...]",
		Short: "Add an internal domain for split-DNS routing",
		Long:  "Add a domain that should be resolved by internal DNS servers (e.g., corp.contoso.com)",
		Args:  cobra.MinimumNArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg := config.DefaultConfig()
			if err := cfg.Load(); err != nil {
				return err
			}
			domain := args[0]
			servers := args[1:]

			cfg.Forwarder.InternalDomains = append(cfg.Forwarder.InternalDomains, config.InternalDomain{
				Domain:     domain,
				DNSServers: servers,
			})

			if err := cfg.Save(); err != nil {
				return err
			}
			fmt.Printf("Added internal domain: %s -> %v\n", domain, servers)
			return nil
		},
	}

	// Show config
	showConfig := &cobra.Command{
		Use:   "show",
		Short: "Show current configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg := config.DefaultConfig()
			if err := cfg.Load(); err != nil {
				fmt.Println("Using default configuration")
			}

			fmt.Println("Nebula DNS Agent Configuration")
			fmt.Println("================================")
			fmt.Printf("API Endpoint:      %s\n", cfg.APIEndpoint)
			fmt.Printf("DoH Endpoint:      %s\n", cfg.DoHEndpoint)
			fmt.Printf("DNS Servers:       %v\n", cfg.DNSServers)
			fmt.Printf("Location ID:       %s\n", cfg.LocationID)
			fmt.Printf("Heartbeat:         %ds\n", cfg.HeartbeatInterval)
			fmt.Printf("Auto Update:       %v\n", cfg.AutoUpdate)
			fmt.Println()
			fmt.Println("Forwarder Settings")
			fmt.Println("------------------")
			fmt.Printf("Enabled:           %v\n", cfg.Forwarder.Enabled)
			fmt.Printf("Listen Address:    %s\n", cfg.Forwarder.ListenAddress)
			fmt.Printf("Cache TTL:         %ds\n", cfg.Forwarder.CacheTTL)
			fmt.Printf("Cache Size:        %d\n", cfg.Forwarder.CacheSize)
			fmt.Printf("Timeout:           %dms\n", cfg.Forwarder.Timeout)
			fmt.Printf("Fallback DNS:      %v\n", cfg.Forwarder.FallbackDNS)
			fmt.Printf("Internal Domains:  %d\n", len(cfg.Forwarder.InternalDomains))
			for _, d := range cfg.Forwarder.InternalDomains {
				fmt.Printf("  - %s -> %v\n", d.Domain, d.DNSServers)
			}
			return nil
		},
	}

	cmd.AddCommand(enableForwarder, disableForwarder, addDomain, showConfig)
	return cmd
}
