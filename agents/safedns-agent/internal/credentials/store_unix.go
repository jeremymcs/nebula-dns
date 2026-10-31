//go:build !windows

package credentials

import (
	"fmt"
	"os"
	"path/filepath"
)

type fileStore struct {
	dir string
}

func openPlatformStore() (Store, error) {
	dir := filepath.Join(DataDir(), "credentials")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	return &fileStore{dir: dir}, nil
}

func (s *fileStore) SaveDeviceSecret(secret string) error {
	return os.WriteFile(filepath.Join(s.dir, "device_secret"), []byte(secret), 0600)
}

func (s *fileStore) LoadDeviceSecret() (string, error) {
	b, err := os.ReadFile(filepath.Join(s.dir, "device_secret"))
	return string(b), err
}

func (s *fileStore) SaveDoHToken(token string) error {
	return os.WriteFile(filepath.Join(s.dir, "doh_token"), []byte(token), 0600)
}

func (s *fileStore) LoadDoHToken() (string, error) {
	b, err := os.ReadFile(filepath.Join(s.dir, "doh_token"))
	return string(b), err
}

func (s *fileStore) DeleteAll() error {
	_ = os.Remove(filepath.Join(s.dir, "device_secret"))
	_ = os.Remove(filepath.Join(s.dir, "doh_token"))
	return nil
}

func ConfigureServiceRecovery(_ string) error {
	return fmt.Errorf("service recovery configuration is Windows-only")
}
