package forwarder

import (
	"testing"
	"time"

	"github.com/miekg/dns"
)

func TestCache_SetAndGet(t *testing.T) {
	cache := NewCache(100, 5*time.Minute)
	defer cache.Clear()

	// Create a test DNS message
	msg := new(dns.Msg)
	msg.SetQuestion("example.com.", dns.TypeA)
	msg.Answer = append(msg.Answer, &dns.A{
		Hdr: dns.RR_Header{Name: "example.com.", Rrtype: dns.TypeA, Class: dns.ClassINET, Ttl: 300},
		A:   []byte{93, 184, 216, 34},
	})

	// Set the cache entry
	cache.Set("example.com.", dns.TypeA, msg)

	// Get the cache entry
	cached := cache.Get("example.com.", dns.TypeA)
	if cached == nil {
		t.Fatal("Expected cache hit, got miss")
	}

	if len(cached.Answer) != 1 {
		t.Fatalf("Expected 1 answer, got %d", len(cached.Answer))
	}
}

func TestCache_Miss(t *testing.T) {
	cache := NewCache(100, 5*time.Minute)
	defer cache.Clear()

	// Try to get non-existent entry
	cached := cache.Get("notexist.com.", dns.TypeA)
	if cached != nil {
		t.Fatal("Expected cache miss, got hit")
	}
}

func TestCache_Expiry(t *testing.T) {
	cache := NewCache(100, 100*time.Millisecond)
	defer cache.Clear()

	msg := new(dns.Msg)
	msg.SetQuestion("expire.com.", dns.TypeA)

	cache.Set("expire.com.", dns.TypeA, msg)

	// Should be cached initially
	if cache.Get("expire.com.", dns.TypeA) == nil {
		t.Fatal("Expected cache hit immediately after set")
	}

	// Wait for expiry
	time.Sleep(150 * time.Millisecond)

	// Should be expired now
	if cache.Get("expire.com.", dns.TypeA) != nil {
		t.Fatal("Expected cache miss after expiry")
	}
}

func TestCache_Eviction(t *testing.T) {
	cache := NewCache(2, 5*time.Minute)
	defer cache.Clear()

	msg1 := new(dns.Msg)
	msg1.SetQuestion("first.com.", dns.TypeA)
	cache.Set("first.com.", dns.TypeA, msg1)

	msg2 := new(dns.Msg)
	msg2.SetQuestion("second.com.", dns.TypeA)
	cache.Set("second.com.", dns.TypeA, msg2)

	// Both should be cached
	if cache.Get("first.com.", dns.TypeA) == nil {
		t.Fatal("Expected first.com to be cached")
	}
	if cache.Get("second.com.", dns.TypeA) == nil {
		t.Fatal("Expected second.com to be cached")
	}

	// Add third entry, should evict oldest (first)
	msg3 := new(dns.Msg)
	msg3.SetQuestion("third.com.", dns.TypeA)
	cache.Set("third.com.", dns.TypeA, msg3)

	// First should be evicted
	if cache.Get("first.com.", dns.TypeA) != nil {
		t.Fatal("Expected first.com to be evicted")
	}

	// Second and third should still be cached
	if cache.Get("second.com.", dns.TypeA) == nil {
		t.Fatal("Expected second.com to still be cached")
	}
	if cache.Get("third.com.", dns.TypeA) == nil {
		t.Fatal("Expected third.com to be cached")
	}
}

func TestCache_Stats(t *testing.T) {
	cache := NewCache(100, 5*time.Minute)
	defer cache.Clear()

	msg := new(dns.Msg)
	msg.SetQuestion("stats.com.", dns.TypeA)
	cache.Set("stats.com.", dns.TypeA, msg)

	// One hit
	cache.Get("stats.com.", dns.TypeA)
	// Two misses
	cache.Get("miss1.com.", dns.TypeA)
	cache.Get("miss2.com.", dns.TypeA)

	size, hits, misses := cache.Stats()
	if size != 1 {
		t.Errorf("Expected size 1, got %d", size)
	}
	if hits != 1 {
		t.Errorf("Expected 1 hit, got %d", hits)
	}
	if misses != 2 {
		t.Errorf("Expected 2 misses, got %d", misses)
	}
}

func TestCache_DifferentTypes(t *testing.T) {
	cache := NewCache(100, 5*time.Minute)
	defer cache.Clear()

	msgA := new(dns.Msg)
	msgA.SetQuestion("multi.com.", dns.TypeA)
	cache.Set("multi.com.", dns.TypeA, msgA)

	msgAAAA := new(dns.Msg)
	msgAAAA.SetQuestion("multi.com.", dns.TypeAAAA)
	cache.Set("multi.com.", dns.TypeAAAA, msgAAAA)

	// Both should be cached separately
	if cache.Get("multi.com.", dns.TypeA) == nil {
		t.Fatal("Expected A record to be cached")
	}
	if cache.Get("multi.com.", dns.TypeAAAA) == nil {
		t.Fatal("Expected AAAA record to be cached")
	}
}

