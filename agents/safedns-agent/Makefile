VERSION ?= 0.1.0
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS := -ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.GitCommit=$(GIT_COMMIT) -s -w"

.PHONY: all build clean test deps

all: build

deps:
	go mod download
	go mod tidy

build: build-linux build-darwin build-windows

build-linux:
	@echo "Building for Linux..."
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o dist/linux-amd64/safedns-agent ./cmd/agent
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o dist/linux-arm64/safedns-agent ./cmd/agent

build-darwin:
	@echo "Building for macOS..."
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o dist/darwin-amd64/safedns-agent ./cmd/agent
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o dist/darwin-arm64/safedns-agent ./cmd/agent

build-windows:
	@echo "Building for Windows..."
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o dist/windows-amd64/safedns-agent.exe ./cmd/agent
	GOOS=windows GOARCH=arm64 go build $(LDFLAGS) -o dist/windows-arm64/safedns-agent.exe ./cmd/agent

test:
	go test -v ./...

clean:
	rm -rf dist/

# Package targets
package-deb: build-linux
	@echo "Creating DEB package..."
	@mkdir -p dist/deb/DEBIAN
	@mkdir -p dist/deb/usr/local/bin
	@mkdir -p dist/deb/etc/safedns
	@mkdir -p dist/deb/lib/systemd/system
	@cp dist/linux-amd64/safedns-agent dist/deb/usr/local/bin/
	@cp scripts/safedns-agent.service dist/deb/lib/systemd/system/
	@echo "Package: safedns-agent" > dist/deb/DEBIAN/control
	@echo "Version: $(VERSION)" >> dist/deb/DEBIAN/control
	@echo "Section: net" >> dist/deb/DEBIAN/control
	@echo "Priority: optional" >> dist/deb/DEBIAN/control
	@echo "Architecture: amd64" >> dist/deb/DEBIAN/control
	@echo "Maintainer: SafeDNS <support@safedns.io>" >> dist/deb/DEBIAN/control
	@echo "Description: SafeDNS Agent for DNS security" >> dist/deb/DEBIAN/control
	dpkg-deb --build dist/deb dist/safedns-agent_$(VERSION)_amd64.deb

package-rpm: build-linux
	@echo "Creating RPM package..."
	# Requires rpmbuild to be installed
	# rpmbuild -bb scripts/safedns-agent.spec

package-pkg: build-darwin
	@echo "Creating macOS PKG..."
	@mkdir -p dist/pkg/root/usr/local/bin
	@mkdir -p dist/pkg/root/Library/LaunchDaemons
	@cp dist/darwin-arm64/safedns-agent dist/pkg/root/usr/local/bin/
	@cp scripts/io.safedns.agent.plist dist/pkg/root/Library/LaunchDaemons/
	pkgbuild --root dist/pkg/root --identifier io.safedns.agent --version $(VERSION) dist/SafeDNS-Agent-$(VERSION).pkg

package-msi: build-windows
	@echo "Creating Windows MSI..."
	# Requires WiX Toolset
	# candle scripts/safedns-agent.wxs -o dist/safedns-agent.wixobj
	# light dist/safedns-agent.wixobj -o dist/SafeDNS-Agent-$(VERSION).msi

