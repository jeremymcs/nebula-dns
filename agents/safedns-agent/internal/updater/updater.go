// Package updater handles agent self-updates
package updater

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"go.uber.org/zap"
)

// UpdateInfo contains information about an available update
type UpdateInfo struct {
	Version     string `json:"version"`
	DownloadURL string `json:"download_url"`
	SHA256      string `json:"sha256"`
}

// Updater handles agent self-updates
type Updater struct {
	logger     *zap.Logger
	httpClient *http.Client
	apiURL     string
}

// NewUpdater creates a new updater
func NewUpdater(logger *zap.Logger, apiURL string) *Updater {
	return &Updater{
		logger: logger,
		httpClient: &http.Client{
			Timeout: 5 * time.Minute,
		},
		apiURL: apiURL,
	}
}

// CheckForUpdate checks if an update is available
func (u *Updater) CheckForUpdate(currentVersion string) (*UpdateInfo, error) {
	platform := runtime.GOOS
	url := fmt.Sprintf("%s/api/v1/agents/update/%s", u.apiURL, platform)

	resp, err := u.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to check for updates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("update check failed with status %d", resp.StatusCode)
	}

	// Parse response (simplified - would use proper JSON parsing)
	// For now, return nil to indicate no update
	return nil, nil
}

// DownloadAndApply downloads and applies an update
func (u *Updater) DownloadAndApply(info *UpdateInfo) error {
	u.logger.Info("Downloading update", zap.String("version", info.Version))

	// Create temp directory for download
	tempDir, err := os.MkdirTemp("", "nebuladns-update-*")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Determine filename based on platform
	var filename string
	switch runtime.GOOS {
	case "windows":
		filename = "nebuladns-agent.exe"
	default:
		filename = "nebuladns-agent"
	}

	downloadPath := filepath.Join(tempDir, filename)

	// Download the update
	if err := u.downloadFile(info.DownloadURL, downloadPath); err != nil {
		return fmt.Errorf("failed to download update: %w", err)
	}

	// Verify checksum
	if info.SHA256 != "" {
		if err := u.verifyChecksum(downloadPath, info.SHA256); err != nil {
			return fmt.Errorf("checksum verification failed: %w", err)
		}
	}

	// Apply the update
	return u.applyUpdate(downloadPath)
}

func (u *Updater) downloadFile(url, destPath string) error {
	resp, err := u.httpClient.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func (u *Updater) verifyChecksum(filePath, expectedHash string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return err
	}

	actualHash := hex.EncodeToString(hasher.Sum(nil))
	if actualHash != expectedHash {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedHash, actualHash)
	}

	return nil
}

func (u *Updater) applyUpdate(newBinaryPath string) error {
	// Get current executable path
	currentExe, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current executable: %w", err)
	}

	// Make new binary executable
	if runtime.GOOS != "windows" {
		if err := os.Chmod(newBinaryPath, 0755); err != nil {
			return fmt.Errorf("failed to set permissions: %w", err)
		}
	}

	// Platform-specific update logic (defined in updater_unix.go / updater_windows.go)
	return u.applyUpdatePlatform(currentExe, newBinaryPath)
}
