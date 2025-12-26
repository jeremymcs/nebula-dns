//go:build windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"go.uber.org/zap"
)

func (u *Updater) applyUpdateWindows(currentExe, newBinaryPath string) error {
	u.logger.Info("Applying update on Windows",
		zap.String("current", currentExe),
		zap.String("new", newBinaryPath))

	// On Windows, we can't replace a running executable directly
	// We need to use a batch script to do the replacement after we exit

	// Create update script
	scriptPath := filepath.Join(os.TempDir(), "safedns-update.bat")
	script := fmt.Sprintf(`@echo off
timeout /t 2 /nobreak > nul
copy /Y "%s" "%s"
del "%s"
net start SafeDNSAgent
del "%%~f0"
`, newBinaryPath, currentExe, newBinaryPath)

	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return fmt.Errorf("failed to create update script: %w", err)
	}

	// Stop the service and run the update script
	exec.Command("net", "stop", "SafeDNSAgent").Run()

	// Start the update script
	cmd := exec.Command("cmd", "/C", "start", "/B", scriptPath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start update script: %w", err)
	}

	// Exit to allow the script to replace the binary
	os.Exit(0)
	return nil
}

// RestartService restarts the agent service on Windows
func (u *Updater) RestartService() error {
	// Stop the service
	if err := exec.Command("net", "stop", "SafeDNSAgent").Run(); err != nil {
		u.logger.Warn("Failed to stop service", zap.Error(err))
	}

	// Start the service
	return exec.Command("net", "start", "SafeDNSAgent").Run()
}

