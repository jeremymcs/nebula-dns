//go:build windows

package shieldca

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// InstallRootCA writes pem to a temp file and imports into LocalMachine Root store.
func InstallRootCA(pem []byte) error {
	dir := filepath.Join(os.Getenv("ProgramData"), "FluxShield")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	certPath := filepath.Join(dir, "flux-shield-ca.pem")
	if err := os.WriteFile(certPath, pem, 0644); err != nil {
		return err
	}
	cmd := exec.Command("certutil", "-addstore", "-f", "Root", certPath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("certutil: %w (%s)", err, string(out))
	}
	return nil
}

// RemoveRootCA removes the Flux Shield CA from LocalMachine Root (best effort).
func RemoveRootCA(subjectSubstring string) error {
	cmd := exec.Command(
		"powershell",
		"-NoProfile",
		"-Command",
		fmt.Sprintf(
			`Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -like '*%s*' } | Remove-Item`,
			subjectSubstring,
		),
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("remove ca: %w (%s)", err, string(out))
	}
	return nil
}
