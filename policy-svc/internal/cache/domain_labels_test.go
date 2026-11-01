package cache

import "testing"

func TestDomainLabelSuffixes(t *testing.T) {
	got := domainLabelSuffixes("sub.evil.com")
	want := []string{"sub.evil.com", "evil.com"}
	if len(got) != len(want) {
		t.Fatalf("got %v want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v want %v", got, want)
		}
	}
}

func TestDomainLabelSuffixesSingle(t *testing.T) {
	got := domainLabelSuffixes("evil.com")
	if len(got) != 1 || got[0] != "evil.com" {
		t.Fatalf("got %v", got)
	}
}
