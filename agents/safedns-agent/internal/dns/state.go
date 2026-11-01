package dns

import (
	"os"
	"path/filepath"
	"runtime"
)

func stateDir() string {
	switch runtime.GOOS {
	case "windows":
		return filepath.Join(os.Getenv("ProgramData"), "FluxShield")
	default:
		return "/var/lib/fluxshield"
	}
}

// EnforcedServers is the loopback resolver clients must use when the stub is active.
var EnforcedServers = []string{"127.0.0.1"}
