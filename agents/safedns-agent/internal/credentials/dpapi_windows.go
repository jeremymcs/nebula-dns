//go:build windows

package credentials

import (
	"fmt"
	"os"
	"path/filepath"
	"unsafe"

	"golang.org/x/sys/windows"
)

const cryptProtectLocalMachine = 0x4

var (
	modCrypt32             = windows.NewLazySystemDLL("crypt32.dll")
	procCryptProtectData   = modCrypt32.NewProc("CryptProtectData")
	procCryptUnprotectData = modCrypt32.NewProc("CryptUnprotectData")
)

type dpapiStore struct {
	dir string
}

func openPlatformStore() (Store, error) {
	dir := filepath.Join(DataDir(), "credentials")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, err
	}
	return &dpapiStore{dir: dir}, nil
}

func (s *dpapiStore) SaveDeviceSecret(secret string) error {
	return s.writeBlob("device_secret.dpapi", []byte(secret))
}

func (s *dpapiStore) LoadDeviceSecret() (string, error) {
	b, err := s.readBlob("device_secret.dpapi")
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (s *dpapiStore) SaveDoHToken(token string) error {
	return s.writeBlob("doh_token.dpapi", []byte(token))
}

func (s *dpapiStore) LoadDoHToken() (string, error) {
	b, err := s.readBlob("doh_token.dpapi")
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (s *dpapiStore) DeleteAll() error {
	_ = os.Remove(filepath.Join(s.dir, "device_secret.dpapi"))
	_ = os.Remove(filepath.Join(s.dir, "doh_token.dpapi"))
	return nil
}

func (s *dpapiStore) writeBlob(name string, plain []byte) error {
	if len(plain) == 0 {
		return fmt.Errorf("empty secret")
	}
	protected, err := protect(plain)
	if err != nil {
		return err
	}
	path := filepath.Join(s.dir, name)
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, protected, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (s *dpapiStore) readBlob(name string) ([]byte, error) {
	path := filepath.Join(s.dir, name)
	protected, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return unprotect(protected)
}

type dataBlob struct {
	cbData uint32
	pbData *byte
}

func protect(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty data")
	}
	in := dataBlob{cbData: uint32(len(data)), pbData: &data[0]}
	var out dataBlob
	r, _, err := procCryptProtectData.Call(
		uintptr(unsafe.Pointer(&in)),
		0,
		0,
		0,
		0,
		uintptr(cryptProtectLocalMachine),
		uintptr(unsafe.Pointer(&out)),
	)
	if r == 0 {
		return nil, fmt.Errorf("CryptProtectData: %w", err)
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.pbData)))
	return copyBlob(out), nil
}

func unprotect(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty blob")
	}
	in := dataBlob{cbData: uint32(len(data)), pbData: &data[0]}
	var out dataBlob
	r, _, err := procCryptUnprotectData.Call(
		uintptr(unsafe.Pointer(&in)),
		0,
		0,
		0,
		0,
		0,
		uintptr(unsafe.Pointer(&out)),
	)
	if r == 0 {
		return nil, fmt.Errorf("CryptUnprotectData: %w", err)
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.pbData)))
	return copyBlob(out), nil
}

func copyBlob(b dataBlob) []byte {
	if b.cbData == 0 || b.pbData == nil {
		return nil
	}
	out := make([]byte, b.cbData)
	copy(out, unsafe.Slice(b.pbData, b.cbData))
	return out
}

func ConfigureServiceRecovery(serviceName string) error {
	if err := runOSExec("sc.exe", "failure", serviceName, "reset=", "86400"); err != nil {
		return err
	}
	return runOSExec("sc.exe", "failure", serviceName, "actions=", "restart/60000/restart/60000/restart/60000")
}
