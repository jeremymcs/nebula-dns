// Package publicip detects public IPv4/IPv6 changes with multi-source echo and backoff.
package publicip

import (
	"context"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Detector resolves the endpoint's public addresses.
type Detector struct {
	client   *http.Client
	sources  []string
	minDelay time.Duration
	mu       sync.Mutex
	last     Addresses
}

// Addresses holds last-known public IPs.
type Addresses struct {
	IPv4 string
	IPv6 string
}

// NewDetector creates a detector with default echo sources.
func NewDetector() *Detector {
	return &Detector{
		client: &http.Client{Timeout: 8 * time.Second},
		sources: []string{
			"https://api64.ipify.org",
			"https://ifconfig.me/ip",
			"https://api.ipify.org",
		},
		minDelay: 2 * time.Second,
	}
}

// Check returns current public IPs and whether they changed vs last successful check.
func (d *Detector) Check(ctx context.Context) (addrs Addresses, changed bool, err error) {
	d.mu.Lock()
	defer d.mu.Unlock()

	var lastErr error
	for _, src := range d.sources {
		select {
		case <-ctx.Done():
			return d.last, false, ctx.Err()
		default:
		}
		ip, fetchErr := d.fetch(ctx, src)
		if fetchErr != nil {
			lastErr = fetchErr
			time.Sleep(d.minDelay)
			continue
		}
		if strings.Contains(ip, ":") {
			addrs.IPv6 = ip
		} else {
			addrs.IPv4 = ip
		}
	}
	if addrs.IPv4 == "" && addrs.IPv6 == "" {
		return d.last, false, lastErr
	}
	changed = addrs.IPv4 != d.last.IPv4 || addrs.IPv6 != d.last.IPv6
	if changed {
		d.last = addrs
	}
	return addrs, changed, nil
}

func (d *Detector) fetch(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	resp, err := d.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 128))
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(body)), nil
}

// ShouldUpdate applies hysteresis — any field change triggers update.
func ShouldUpdate(prev, next Addresses) bool {
	if next.IPv4 != "" && next.IPv4 != prev.IPv4 {
		return true
	}
	if next.IPv6 != "" && next.IPv6 != prev.IPv6 {
		return true
	}
	return false
}
