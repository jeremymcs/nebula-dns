// Nebula DNS / Flux Shield — domain suffix labels for parent matching (sub.evil.com → evil.com).

package cache

import "strings"

func domainLabelSuffixes(domain string) []string {
	domain = strings.ToLower(strings.TrimSpace(domain))
	if domain == "" {
		return nil
	}
	parts := strings.Split(domain, ".")
	if len(parts) < 2 {
		return []string{domain}
	}
	out := make([]string, 0, len(parts)-1)
	for i := 0; i < len(parts)-1; i++ {
		out = append(out, strings.Join(parts[i:], "."))
	}
	return out
}
