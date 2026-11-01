package publicip

import "testing"

func TestShouldUpdate(t *testing.T) {
	prev := Addresses{IPv4: "203.0.113.1", IPv6: "2001:db8::1"}
	if ShouldUpdate(prev, Addresses{IPv4: "203.0.113.1", IPv6: "2001:db8::1"}) {
		t.Fatal("expected no update")
	}
	if !ShouldUpdate(prev, Addresses{IPv4: "203.0.113.2"}) {
		t.Fatal("expected ipv4 change")
	}
	if !ShouldUpdate(prev, Addresses{IPv6: "2001:db8::2"}) {
		t.Fatal("expected ipv6 change")
	}
}

func TestDetectorRecordsChange(t *testing.T) {
	d := NewDetector()
	d.last = Addresses{IPv4: "198.51.100.10"}
	changed := ShouldUpdate(d.last, Addresses{IPv4: "198.51.100.11"})
	if !changed {
		t.Fatal("expected changed")
	}
}
