package enforce

import (
	"testing"
)

type fakeCtrl struct {
	ok     bool
	detail string
	applyN int
}

func (f *fakeCtrl) ApplyEnforcement() error {
	f.applyN++
	f.ok = true
	return nil
}

func (f *fakeCtrl) CheckEnforcement() (bool, string, error) {
	return f.ok, f.detail, nil
}

func TestWatcherDetectsTamperAndReapplies(t *testing.T) {
	ctrl := &fakeCtrl{ok: false, detail: "Ethernet=8.8.8.8"}
	var tamper bool
	var detail string
	w := NewWatcher(ctrl, func(d bool, msg string) {
		tamper = d
		detail = msg
	})
	w.runCheck()
	if !tamper {
		t.Fatal("expected tamper")
	}
	if ctrl.applyN != 1 {
		t.Fatalf("expected re-apply, got %d", ctrl.applyN)
	}
	if detail == "" {
		t.Fatal("expected detail")
	}
}

func TestWatcherClearsTamperWhenCompliant(t *testing.T) {
	ctrl := &fakeCtrl{ok: true}
	tamper := true
	w := NewWatcher(ctrl, func(d bool, _ string) { tamper = d })
	w.runCheck()
	if tamper {
		t.Fatal("expected no tamper")
	}
}
