package forwarder

import (
	"sync"
	"time"

	"github.com/miekg/dns"
)

// cacheEntry represents a cached DNS response
type cacheEntry struct {
	msg      *dns.Msg
	expiry   time.Time
	inserted time.Time
}

// Cache provides thread-safe DNS response caching with TTL support
type Cache struct {
	mu      sync.RWMutex
	entries map[string]*cacheEntry
	maxSize int
	ttl     time.Duration
	hits    uint64
	misses  uint64
}

// NewCache creates a new DNS cache
func NewCache(maxSize int, ttl time.Duration) *Cache {
	c := &Cache{
		entries: make(map[string]*cacheEntry),
		maxSize: maxSize,
		ttl:     ttl,
	}

	// Start cleanup goroutine
	go c.cleanupLoop()

	return c
}

// cacheKey generates a unique key for the cache entry
func cacheKey(name string, qtype uint16) string {
	return name + ":" + dns.TypeToString[qtype]
}

// Get retrieves a cached DNS response
func (c *Cache) Get(name string, qtype uint16) *dns.Msg {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := cacheKey(name, qtype)
	entry, exists := c.entries[key]
	if !exists {
		c.misses++
		return nil
	}

	// Check if expired
	if time.Now().After(entry.expiry) {
		c.misses++
		return nil
	}

	c.hits++

	// Return a copy to prevent modification
	return entry.msg.Copy()
}

// Set stores a DNS response in the cache
func (c *Cache) Set(name string, qtype uint16, msg *dns.Msg) {
	if msg == nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// Determine TTL from response or use default
	ttl := c.ttl
	if len(msg.Answer) > 0 {
		// Use minimum TTL from answer section
		minTTL := msg.Answer[0].Header().Ttl
		for _, rr := range msg.Answer {
			if rr.Header().Ttl < minTTL {
				minTTL = rr.Header().Ttl
			}
		}
		if time.Duration(minTTL)*time.Second < ttl {
			ttl = time.Duration(minTTL) * time.Second
		}
	}

	// Evict if at capacity (simple LRU-like: remove oldest)
	if len(c.entries) >= c.maxSize {
		c.evictOldest()
	}

	key := cacheKey(name, qtype)
	c.entries[key] = &cacheEntry{
		msg:      msg.Copy(),
		expiry:   time.Now().Add(ttl),
		inserted: time.Now(),
	}
}

// evictOldest removes the oldest cache entry
func (c *Cache) evictOldest() {
	var oldestKey string
	var oldestTime time.Time

	for key, entry := range c.entries {
		if oldestKey == "" || entry.inserted.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.inserted
		}
	}

	if oldestKey != "" {
		delete(c.entries, oldestKey)
	}
}

// cleanupLoop periodically removes expired entries
func (c *Cache) cleanupLoop() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.cleanup()
	}
}

// cleanup removes all expired entries
func (c *Cache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, entry := range c.entries {
		if now.After(entry.expiry) {
			delete(c.entries, key)
		}
	}
}

// Stats returns cache statistics
func (c *Cache) Stats() (size int, hits, misses uint64) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.entries), c.hits, c.misses
}

// Clear removes all entries from the cache
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]*cacheEntry)
	c.hits = 0
	c.misses = 0
}

// Size returns the current number of entries in the cache
func (c *Cache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.entries)
}
