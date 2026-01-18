# Phase 2: Tenant Search - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can quickly find any tenant in the system by name, ID, or email. This is a search/lookup capability only — viewing tenant details and taking actions (like impersonation) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Response Shape
- Minimal response: tenant ID, name, status, tier — just enough to identify and select
- Include matching user's email when search was by email (shows which user matched)
- No match reason indicator — admin knows what they searched for
- Include suspension reason when status is suspended (helps admin understand situation)

### Search Behavior
- Single unified endpoint with auto-detection:
  - UUID format → ID lookup
  - Email format → email search
  - Otherwise → name search
- Email search matches any user in the tenant, not just admins
- Partial name matching approach: Claude's discretion
- Minimum query length: Claude's discretion

### Result Handling
- Cursor-based pagination
- 20 results per page by default
- Include total count of all matches ("Showing 1-20 of 47 results")
- Result ordering: Claude's discretion

### Error Responses
- Validate query (reject too short, whitespace-only, etc.) with 400 error
- ID search returns empty array if not found (consistent with name search)
- Standard admin rate limiting applied
- No results response: Claude's discretion (200 empty vs 404)

### Claude's Discretion
- Partial name matching strategy (contains vs starts-with, case handling)
- Minimum query length
- Result ordering logic
- No-results HTTP status code

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for admin search endpoints.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-tenant-search*
*Context gathered: 2026-01-17*
