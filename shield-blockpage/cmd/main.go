// Flux Shield HTTPS block page terminator (dynamic leaf certs via API)
package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var errNoCertificate = errors.New("tls: no certificate available")

type leafResponse struct {
	Data struct {
		CertificatePem string `json:"certificatePem"`
		PrivateKeyPem  string `json:"privateKeyPem"`
	} `json:"data"`
}

var certCache sync.Map

func main() {
	apiURL := env("SHIELD_BLOCKPAGE_API_URL", "http://api:3000")
	secret := env("SHIELD_BLOCKPAGE_INTERNAL_SECRET", "dev-blockpage-internal-secret")
	listen := env("SHIELD_BLOCKPAGE_HTTPS_ADDR", ":9443")
	upstream, _ := url.Parse(apiURL)
	proxy := httputil.NewSingleHostReverseProxy(upstream)
	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = upstream.Scheme
		req.URL.Host = upstream.Host
		req.URL.Path = "/block-pages/public/serve"
		req.Host = req.Header.Get("X-Forwarded-Host")
	}

	server := &http.Server{
		Addr: listen,
		Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Header.Set("X-Forwarded-Host", r.Host)
			proxy.ServeHTTP(w, r)
		}),
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS12,
			GetCertificate: func(ch *tls.ClientHelloInfo) (*tls.Certificate, error) {
				domain := strings.ToLower(strings.TrimSuffix(ch.ServerName, "."))
				if domain == "" {
					return nil, errNoCertificate
				}
				if v, ok := certCache.Load(domain); ok {
					if entry, ok := v.(cacheEntry); ok && entry.expires.After(time.Now()) {
						return entry.cert, nil
					}
				}
				cert, err := fetchLeaf(apiURL, secret, domain)
				if err != nil {
					return nil, err
				}
				certCache.Store(domain, cacheEntry{cert: cert, expires: time.Now().Add(6 * time.Hour)})
				return cert, nil
			},
		},
	}
	log.Printf("shield-blockpage listening on %s", listen)
	log.Fatal(server.ListenAndServeTLS("", ""))
}

type cacheEntry struct {
	cert    *tls.Certificate
	expires time.Time
}

func fetchLeaf(apiURL, secret, domain string) (*tls.Certificate, error) {
	body, err := json.Marshal(map[string]string{"domain": domain})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(http.MethodPost, strings.TrimRight(apiURL, "/")+"/shield-ca/internal/issue-leaf", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Shield-Internal-Secret", secret)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusCreated && res.StatusCode != http.StatusOK {
		_, _ = io.ReadAll(res.Body)
		return nil, errNoCertificate
	}
	var parsed leafResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	pair, err := tls.X509KeyPair([]byte(parsed.Data.CertificatePem), []byte(parsed.Data.PrivateKeyPem))
	if err != nil {
		return nil, err
	}
	return &pair, nil
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
