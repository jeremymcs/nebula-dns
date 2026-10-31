//go:build windows

package credentials

import (
	"os/exec"
)

func runOSExec(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return err
	}
	_ = out
	return nil
}
