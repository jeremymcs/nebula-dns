package apiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/google/uuid"
)

// RegisterRequest matches the API register DTO.
type RegisterRequest struct {
	DeviceID           string   `json:"deviceId"`
	DeviceName         string   `json:"deviceName,omitempty"`
	Platform           string   `json:"platform"`
	OSVersion          string   `json:"osVersion,omitempty"`
	AgentVersion       string   `json:"agentVersion"`
	InstallationToken  string   `json:"installationToken"`
	Roles              []string `json:"roles,omitempty"`
}

// RegisterResponse is the API registration payload.
type RegisterResponse struct {
	Success bool `json:"success"`
	Data    struct {
		ID           string   `json:"id"`
		DeviceName   string   `json:"deviceName"`
		LocationID   string   `json:"locationId"`
		Roles        []string `json:"roles"`
		DeviceSecret string   `json:"deviceSecret"`
		DohToken     string   `json:"dohToken"`
		Config       struct {
			APIEndpoint      string   `json:"apiEndpoint"`
			DoHEndpoint      string   `json:"dohEndpoint"`
			DNSServers       []string `json:"dnsServers"`
			Roles            []string `json:"roles"`
			TenantID         string   `json:"tenantId"`
			LocationID       string   `json:"locationId"`
			InternalDnsZones []string `json:"internalDnsZones"`
		} `json:"config"`
	} `json:"data"`
}

// Register enrolls this machine with Flux Shield.
func Register(apiBase, token, agentVersion string, roles []string) (deviceID string, resp *RegisterResponse, err error) {
	id, _ := uuid.NewRandom()
	deviceID = id.String()
	hostname, _ := os.Hostname()
	body, err := json.Marshal(RegisterRequest{
		DeviceID:          deviceID,
		DeviceName:        hostname,
		Platform:          platformName(),
		AgentVersion:      agentVersion,
		InstallationToken: token,
		Roles:             roles,
	})
	if err != nil {
		return "", nil, err
	}
	url := fmt.Sprintf("%s/api/v1/agents/register", trimSlash(apiBase))
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	httpResp, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer httpResp.Body.Close()
	if httpResp.StatusCode >= 300 {
		return "", nil, fmt.Errorf("register failed: HTTP %d", httpResp.StatusCode)
	}
	var out RegisterResponse
	if err := json.NewDecoder(httpResp.Body).Decode(&out); err != nil {
		return "", nil, err
	}
	if !out.Success {
		return "", nil, fmt.Errorf("register rejected")
	}
	return deviceID, &out, nil
}

func platformName() string {
	switch runtime.GOOS {
	case "windows":
		return "windows"
	case "darwin":
		return "macos"
	default:
		return "linux"
	}
}

func trimSlash(s string) string {
	for len(s) > 0 && s[len(s)-1] == '/' {
		s = s[:len(s)-1]
	}
	return s
}
