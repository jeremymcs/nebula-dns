//go:build !windows

package shieldca

func InstallRootCA(_ []byte) error {
	return nil
}

func RemoveRootCA(_ string) error {
	return nil
}
