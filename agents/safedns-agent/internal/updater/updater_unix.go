//go:build !windows

package updater

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"

	"go.uber.org/zap"
)

func (u *Updater) applyUpdateUnix(currentExe, newBinaryPath string) error {
	u.logger.Info("Applying update on Unix",
		zap.String("current", currentExe),
		zap.String("new", newBinaryPath))

	// Backup current executable
	backupPath := currentExe + ".bak"
	if err := os.Rename(currentExe, backupPath); err != nil {
		return fmt.Errorf("failed to backup current executable: %w", err)
	}

	// Move new binary to current location
	if err := os.Rename(newBinaryPath, currentExe); err != nil {
		// Restore backup on failure
		os.Rename(backupPath, currentExe)
		return fmt.Errorf("failed to install new executable: %w", err)
	}

	// Remove backup
	os.Remove(backupPath)

	u.logger.Info("Update applied successfully, restarting...")

	// Restart the service
	// On systemd systems, the service manager will restart us
	// On macOS, launchd will restart us
	// For now, just exec the new binary
	return syscall.Exec(currentExe, os.Args, os.Environ())
}

// RestartService restarts the agent service
func (u *Updater) RestartService() error {
	// Try systemd first
	if _, err := exec.LookPath("systemctl"); err == nil {
		cmd := exec.Command("systemctl", "restart", "safedns-agent")
		return cmd.Run()
	}

	// Try launchctl on macOS
	if _, err := exec.LookPath("launchctl"); err == nil {
		// Unload and reload the service
		exec.Command("launchctl", "unload", "/Library/LaunchDaemons/io.safedns.agent.plist").Run()
		cmd := exec.Command("launchctl", "load", "/Library/LaunchDaemons/io.safedns.agent.plist")
		return cmd.Run()
	}

	return fmt.Errorf("no supported service manager found")
}

