package credentials

import (
	"os"
	"path/filepath"
	"runtime"
)

// Store persists agent secrets outside plaintext config.
type Store interface {
	SaveDeviceSecret(secret string) error
	LoadDeviceSecret() (string, error)
	SaveDoHToken(token string) error
	LoadDoHToken() (string, error)
	DeleteAll() error
}

// Open returns the platform secret store (DPAPI machine scope on Windows).
func Open() (Store, error) {
	return openPlatformStore()
}

// DataDir is the Flux Shield agent data directory.
func DataDir() string {
	if runtime.GOOS == "windows" {
		return filepath.Join(os.Getenv("ProgramData"), "FluxShield")
	}
	return "/var/lib/fluxshield"
}
