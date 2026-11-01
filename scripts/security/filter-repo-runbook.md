# Git history secret purge (approved by repo owner)

**Do not run force-push until the tree cleanup PR is merged and you are explicitly told to execute.**

## Preconditions

1. Merge PR removing `.plans/GO-LIVE-PLAN.md` from the tree and hardening `.gitignore`.
2. Rotate live credentials that ever appeared in history (DigitalOcean, SendGrid, Sentry, ClickHouse, AWS/Spaces, and regenerate dev TLS material if those keys left local dev).
3. Temporarily adjust GitHub branch/tag protection if it blocks force-push (see status report in the security PR).

## Mirror clone

```bash
git clone --mirror git@github.com:jeremymcs/nebula-dns.git nebula-dns.git
cd nebula-dns.git
```

## Rewrite (paths + replace-text)

Install `git-filter-repo` (pip or package). Then:

```bash
git filter-repo --force \
  --paths-from-file filter-repo-paths.txt \
  --invert-paths \
  --replace-text filter-repo-replacements.txt
```

Copy `filter-repo-paths.txt` and `filter-repo-replacements.txt` from `scripts/security/` on the post-merge default branch into the mirror directory before running, or pass absolute paths.

## Restore useful tree content (after rewrite, on a normal clone)

- **Go-live checklist:** re-add the current placeholder-only `.plans/GO-LIVE-PLAN.md` if still desired (file is gitignored by name; use `git add -f` only if you choose to track a sanitized copy, or keep it local-only).
- **Dev TLS certs:** run `config/certs/generate-dev-certs.sh` locally; do not recommit private keys. Public `.crt` files may be regenerated and committed if the build/docs require them.

## Force-push (owner-approved step only)

From the mirror:

```bash
git push --force --all origin
git push --force --tags origin
```

Tag **`v1.2`** must be rewritten and re-pushed (`d289294` → new hash).

## Verify

- Re-run gitleaks / secret scan on all refs.
- Confirm `git rev-list --all --objects | rg 'GO-LIVE-PLAN|config/certs/.*\\.key'` returns nothing.
