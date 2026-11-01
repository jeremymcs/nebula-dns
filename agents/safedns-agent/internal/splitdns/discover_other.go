//go:build !windows

package splitdns

// DiscoverWindowsProfile is a no-op on non-Windows platforms.
func DiscoverWindowsProfile(configuredZones []string) (Profile, error) {
	return Profile{ConfiguredZones: configuredZones}, nil
}
