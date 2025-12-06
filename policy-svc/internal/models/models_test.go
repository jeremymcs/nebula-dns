// Nebula DNS - Enterprise DNS Security Platform
// Copyright (c) 2024 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Models Tests

package models

import (
	"testing"
)

func TestSuffixTrie_ExactMatch(t *testing.T) {
	trie := NewSuffixTrie()
	trie.Insert("example.com")

	if !trie.Match("example.com") {
		t.Error("Expected exact match for 'example.com'")
	}

	if trie.Match("other.com") {
		t.Error("Should not match 'other.com'")
	}
}

func TestSuffixTrie_WildcardMatch(t *testing.T) {
	trie := NewSuffixTrie()
	trie.Insert("*.example.com")

	testCases := []struct {
		domain  string
		matches bool
	}{
		{"subdomain.example.com", true},
		{"deep.subdomain.example.com", true},
		{"example.com", false},
		{"other.com", false},
		{"notexample.com", false},
	}

	for _, tc := range testCases {
		result := trie.Match(tc.domain)
		if result != tc.matches {
			t.Errorf("For domain '%s': expected %v, got %v", tc.domain, tc.matches, result)
		}
	}
}

func TestSuffixTrie_MultiplePatterns(t *testing.T) {
	trie := NewSuffixTrie()
	trie.Insert("*.malware.com")
	trie.Insert("phishing.bad.com")
	trie.Insert("*.advertising.net")

	testCases := []struct {
		domain  string
		matches bool
	}{
		{"tracker.malware.com", true},
		{"deep.tracker.malware.com", true},
		{"phishing.bad.com", true},
		{"ads.advertising.net", true},
		{"safe.com", false},
		{"malware.com", false},
		{"bad.com", false},
	}

	for _, tc := range testCases {
		result := trie.Match(tc.domain)
		if result != tc.matches {
			t.Errorf("For domain '%s': expected %v, got %v", tc.domain, tc.matches, result)
		}
	}
}

func TestSuffixTrie_EmptyTrie(t *testing.T) {
	trie := NewSuffixTrie()

	if trie.Match("anything.com") {
		t.Error("Empty trie should not match any domain")
	}
}

func TestSuffixTrie_TopLevelDomain(t *testing.T) {
	trie := NewSuffixTrie()
	trie.Insert("*.xyz")

	if !trie.Match("malicious.xyz") {
		t.Error("Expected match for 'malicious.xyz'")
	}

	if trie.Match("example.com") {
		t.Error("Should not match 'example.com'")
	}
}

func TestReverseDomainLabels(t *testing.T) {
	testCases := []struct {
		input    string
		expected []string
	}{
		{"www.example.com", []string{"com", "example", "www"}},
		{"example.com", []string{"com", "example"}},
		{"localhost", []string{"localhost"}},
		{"a.b.c.d.e", []string{"e", "d", "c", "b", "a"}},
	}

	for _, tc := range testCases {
		result := reverseDomainLabels(tc.input)
		if len(result) != len(tc.expected) {
			t.Errorf("For domain '%s': expected %d labels, got %d", tc.input, len(tc.expected), len(result))
			continue
		}
		for i, label := range result {
			if label != tc.expected[i] {
				t.Errorf("For domain '%s': label %d expected '%s', got '%s'", tc.input, i, tc.expected[i], label)
			}
		}
	}
}

func BenchmarkSuffixTrie_Match(b *testing.B) {
	trie := NewSuffixTrie()
	
	// Add 1000 patterns
	for i := 0; i < 1000; i++ {
		trie.Insert("*.blocked" + string(rune(i%26+'a')) + ".com")
	}

	domains := []string{
		"example.com",
		"subdomain.blockeda.com",
		"deep.nested.blockedz.com",
		"safe.website.org",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		trie.Match(domains[i%len(domains)])
	}
}

func BenchmarkSuffixTrie_Insert(b *testing.B) {
	domains := []string{
		"*.example.com",
		"blocked.site.net",
		"*.malware.org",
		"phishing.bad.com",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		trie := NewSuffixTrie()
		for _, d := range domains {
			trie.Insert(d)
		}
	}
}
