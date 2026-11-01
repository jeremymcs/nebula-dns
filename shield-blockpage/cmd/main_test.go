package main

import "testing"

func TestEnvDefault(t *testing.T) {
	t.Setenv("SHIELD_BLOCKPAGE_HTTPS_ADDR", "")
	if got := env("SHIELD_BLOCKPAGE_HTTPS_ADDR", ":9443"); got != ":9443" {
		t.Fatalf("expected default :9443, got %q", got)
	}
}

func TestEnvOverride(t *testing.T) {
	t.Setenv("SHIELD_BLOCKPAGE_HTTPS_ADDR", ":8443")
	if got := env("SHIELD_BLOCKPAGE_HTTPS_ADDR", ":9443"); got != ":8443" {
		t.Fatalf("expected :8443, got %q", got)
	}
}
