package shieldca

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/fluxlabs/dns-filter/agents/safedns-agent/internal/config"
)

// SyncFromAPI downloads and installs the tenant Shield CA when enabled in config.
func SyncFromAPI(cfg *config.Config, deviceID string) error {
	if !cfg.GetInstallShieldCa() {
		return nil
	}
	if cfg.GetLocationID() == "" || deviceID == "" {
		return fmt.Errorf("shield ca sync requires location and device id")
	}
	base := cfg.GetAPIEndpoint()
	u, err := url.Parse(base)
	if err != nil {
		return err
	}
	u.Path = "/agents/shield-ca/certificate.pem"
	q := u.Query()
	q.Set("device_id", deviceID)
	u.RawQuery = q.Encode()

	client := &http.Client{Timeout: 30 * time.Second}
	res, err := client.Get(u.String())
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("shield ca download failed: %s", string(body))
	}
	pem, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	return InstallRootCA(pem)
}

func Remove(cfg *config.Config) error {
	if !cfg.GetInstallShieldCa() {
		return nil
	}
	return RemoveRootCA("Flux Shield")
}
