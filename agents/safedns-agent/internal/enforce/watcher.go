package enforce

import (
	"context"
	"sync"
	"time"
)

// DNSController applies and verifies DNS enforcement.
type DNSController interface {
	ApplyEnforcement() error
	CheckEnforcement() (ok bool, detail string, err error)
}

// TamperReporter receives tamper events for heartbeat reporting.
type TamperReporter func(detected bool, detail string)

// Watcher periodically re-applies DNS enforcement and detects drift.
type Watcher struct {
	ctrl       DNSController
	interval   time.Duration
	pollNet    time.Duration
	onTamper   TamperReporter
	mu         sync.Mutex
	lastDetail string
}

// NewWatcher creates a DNS drift watcher.
func NewWatcher(ctrl DNSController, onTamper TamperReporter) *Watcher {
	return &Watcher{
		ctrl:     ctrl,
		interval: 30 * time.Second,
		pollNet:  10 * time.Second,
		onTamper: onTamper,
	}
}

// Start runs until ctx is cancelled.
func (w *Watcher) Start(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	netTicker := time.NewTicker(w.pollNet)
	defer ticker.Stop()
	defer netTicker.Stop()

	w.runCheck()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runCheck()
		case <-netTicker.C:
			w.runCheck()
		}
	}
}

func (w *Watcher) runCheck() {
	ok, detail, err := w.ctrl.CheckEnforcement()
	if err != nil {
		return
	}
	if ok {
		w.mu.Lock()
		w.lastDetail = ""
		w.mu.Unlock()
		if w.onTamper != nil {
			w.onTamper(false, "")
		}
		return
	}
	if err := w.ctrl.ApplyEnforcement(); err != nil {
		detail = detail + "; re-apply failed: " + err.Error()
	}
	w.mu.Lock()
	w.lastDetail = detail
	w.mu.Unlock()
	if w.onTamper != nil {
		w.onTamper(true, detail)
	}
}

// LastTamperDetail returns the most recent tamper detail.
func (w *Watcher) LastTamperDetail() string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.lastDetail
}
