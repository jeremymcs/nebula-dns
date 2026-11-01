package cache

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"go.uber.org/zap"
)

func (c *PolicyCache) requestPolicyCompile(ctx context.Context, locationID string) {
	apiBase := strings.TrimRight(os.Getenv("POLICY_COMPILE_API_URL"), "/")
	secret := os.Getenv("INTERNAL_API_SECRET")
	if apiBase == "" || secret == "" {
		return
	}

	url := fmt.Sprintf("%s/internal/v1/policy/locations/%s/compile", apiBase, locationID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(nil))
	if err != nil {
		c.logger.Warn("Failed to build compile-on-miss request", zap.Error(err))
		return
	}
	req.Header.Set("X-Internal-Secret", secret)

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.logger.Warn("Compile-on-miss request failed",
			zap.String("locationId", locationID),
			zap.Error(err),
		)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 300 {
		c.logger.Warn("Compile-on-miss returned non-success",
			zap.String("locationId", locationID),
			zap.Int("status", resp.StatusCode),
		)
	}
}
