package dns

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// AdapterDNS holds DNS servers for one interface before enforcement.
type AdapterDNS struct {
	Name    string   `json:"name"`
	Servers []string `json:"servers"`
}

// AdapterBackup is persisted so crash/uninstall can restore DNS.
type AdapterBackup struct {
	Adapters []AdapterDNS `json:"adapters"`
}

func backupPath() string {
	return filepath.Join(stateDir(), "dns_backup.json")
}

func loadBackupFromDisk() (*AdapterBackup, error) {
	data, err := os.ReadFile(backupPath())
	if err != nil {
		return nil, err
	}
	var b AdapterBackup
	if err := json.Unmarshal(data, &b); err != nil {
		return nil, err
	}
	return &b, nil
}

func saveBackupToDisk(b *AdapterBackup) error {
	if err := os.MkdirAll(filepath.Dir(backupPath()), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(b, "", "  ")
	if err != nil {
		return err
	}
	tmp := backupPath() + ".tmp"
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, backupPath())
}

func removeBackupFile() error {
	return os.Remove(backupPath())
}
