# Phase 9: Admin Auth UI - Research

**Researched:** 2026-01-18
**Domain:** Next.js Admin Authentication UI
**Confidence:** HIGH

## Summary

This phase implements the frontend authentication UI for Mission Control (admin dashboard). The backend API was completed in Phase 1, providing endpoints for admin login (`POST /admin/login`), logout (`POST /admin/logout`), and profile retrieval (`GET /admin/me`). The existing tenant authentication system in `AuthContext.tsx` provides excellent patterns to follow, and the current login page (`app/page.tsx`) demonstrates the split-screen cosmic design.

The admin auth differs from tenant auth in key ways:
- Separate JWT tokens with different secrets (8-hour expiry vs 15-minute tenant tokens)
- Stricter password requirements (14+ characters vs 8)
- Admin-specific API routes under `/admin/*` prefix
- No MFA in this phase (deferred to later phase)

**Primary recommendation:** Create a parallel admin auth system (`AdminAuthContext`) following the same patterns as the tenant `AuthContext`, with Mission Control-specific routes under `/mission-control/*`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x | UI framework | Already used in project |
| React Context | 18.x | State management | Existing pattern in AuthContext |
| localStorage | Native | Token storage | Current tenant auth pattern |
| SWR | 2.x | Data fetching | Used throughout for API hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | 10.x | Animations | Page transitions, toasts |
| @headlessui/react | 1.7.x | Dropdown menus | Header user dropdown |
| zod | 3.x | Form validation | Login form validation |
| @heroicons/react | 2.x | Icons | UI icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage | httpOnly cookies | More secure but requires API changes (deferred) |
| Context API | Zustand | Overkill for auth state, inconsistent with existing patterns |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
ui/src/
├── app/
│   └── mission-control/
│       ├── layout.tsx              # Admin layout (already exists, needs update)
│       ├── login/
│       │   └── page.tsx            # NEW: Admin login page
│       ├── page.tsx                # Existing dashboard (needs auth protection)
│       └── [...other admin routes]
├── contexts/
│   └── AdminAuthContext.tsx        # NEW: Admin auth state management
├── components/
│   └── mission-control/
│       ├── AdminHeader.tsx         # NEW: Header with session indicator
│       ├── AdminProtectedRoute.tsx # NEW: Route protection wrapper
│       └── SessionWarningModal.tsx # NEW: Session expiry warning
└── lib/
    └── admin-api.ts                # NEW: Admin API helpers
```

### Pattern 1: Separate Auth Context for Admin
**What:** Create `AdminAuthContext` parallel to `AuthContext`
**When to use:** Admin auth has different token handling, routes, and session management
**Example:**
```typescript
// Source: Based on existing AuthContext.tsx pattern
interface AdminUser {
  id: string
  email: string
  name: string
  status: 'active' | 'suspended' | 'pending_mfa'
  mfaSetupComplete: boolean
  lastLoginAt: Date | null
}

interface AdminAuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  sessionExpiresAt: Date | null
}
```

### Pattern 2: Token Storage with Prefix
**What:** Store admin tokens with distinct localStorage keys
**When to use:** To avoid conflicts with tenant auth tokens
**Example:**
```typescript
// Admin tokens use different keys than tenant tokens
const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'
const ADMIN_SESSION_EXPIRY_KEY = 'admin_session_expiry'

// Tenant tokens (existing)
const TOKEN_KEY = 'token'
const USER_KEY = 'user'
```

### Pattern 3: Route Protection via Layout
**What:** Check auth in layout.tsx before rendering children
**When to use:** All Mission Control routes need protection
**Example:**
```typescript
// Source: Based on existing mission-control/layout.tsx
export default function MissionControlLayout({ children }) {
  const { admin, loading } = useAdminAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !admin && !pathname?.includes('/login')) {
      router.push('/mission-control/login')
    }
  }, [loading, admin, pathname, router])

  if (loading) return <FullPageLoading />
  if (!admin && !pathname?.includes('/login')) return <FullPageLoading />

  return <>{children}</>
}
```

### Anti-Patterns to Avoid
- **Mixing tenant and admin auth:** Keep separate contexts and token storage
- **Client-side only validation:** Always validate tokens server-side (API validates JWT)
- **Storing sensitive data in localStorage:** Only store tokens, not passwords
- **No loading states:** Always show loading while checking auth

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | Existing `useToast()` hook | Already styled and animated |
| Loading spinners | Custom spinner | `FullPageLoading` component | Consistent UX |
| Form validation | Manual validation | Zod schemas | Type-safe, reusable |
| Dropdown menus | Custom dropdown | @headlessui/react `Menu` | Accessibility built-in |
| Modal dialogs | Custom modal | @headlessui/react `Dialog` | Keyboard/focus handling |

**Key insight:** The existing codebase has well-designed, reusable components for all common UI patterns. Use them instead of creating new ones.

## Common Pitfalls

### Pitfall 1: SSR Hydration Mismatch
**What goes wrong:** localStorage access during SSR causes hydration errors
**Why it happens:** Next.js renders on server where localStorage doesn't exist
**How to avoid:** Use `useEffect` to access localStorage, check `typeof window !== 'undefined'`
**Warning signs:** Console errors about hydration mismatches

### Pitfall 2: Token Expiry Race Condition
**What goes wrong:** User sees content briefly before being redirected
**Why it happens:** Auth check completes after initial render
**How to avoid:** Show loading state until auth status is definitively known
**Warning signs:** Flash of content before redirect

### Pitfall 3: Return URL Not Preserved
**What goes wrong:** User logs in but goes to dashboard instead of original page
**Why it happens:** Original URL not stored before redirect to login
**How to avoid:** Store `returnUrl` in query params or sessionStorage
**Warning signs:** Users complaining about navigation

### Pitfall 4: Session Expiry Warning Too Late
**What goes wrong:** User gets logged out without warning
**Why it happens:** Warning modal logic doesn't account for background tabs
**How to avoid:** Use `setInterval` to check expiry, not just `setTimeout`
**Warning signs:** Angry users losing work

## Code Examples

Verified patterns from official sources and existing codebase:

### Admin Login API Call
```typescript
// Source: Based on admin.controller.ts API structure
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface AdminLoginResponse {
  accessToken: string
  expiresIn: number // seconds (28800 = 8 hours)
  admin: {
    id: string
    email: string
    name: string
    status: 'active' | 'suspended' | 'pending_mfa'
    mfaSetupComplete: boolean
  }
}

async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Invalid credentials')
  }

  return res.json()
}
```

### Admin Profile Fetch
```typescript
// Source: Based on admin.controller.ts GET /admin/me
interface AdminProfileResponse {
  id: string
  email: string
  name: string
  status: 'active' | 'suspended' | 'pending_mfa'
  lastLoginAt: string | null
  mfaVerified: boolean
}

async function getAdminProfile(token: string): Promise<AdminProfileResponse> {
  const res = await fetch(`${API_URL}/admin/me`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  })

  if (!res.ok) {
    throw new Error('Session expired')
  }

  return res.json()
}
```

### Admin Logout API Call
```typescript
// Source: Based on admin.controller.ts POST /admin/logout
async function adminLogout(token: string): Promise<void> {
  await fetch(`${API_URL}/admin/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  })
  // Note: Clear local state even if API call fails
}
```

### Session Expiry Check
```typescript
// Source: Context decision in 09-CONTEXT.md - 5 minute warning
function useSessionWarning(expiresAt: Date | null, onWarning: () => void) {
  useEffect(() => {
    if (!expiresAt) return

    const checkInterval = setInterval(() => {
      const now = new Date()
      const timeLeft = expiresAt.getTime() - now.getTime()
      const fiveMinutes = 5 * 60 * 1000

      if (timeLeft > 0 && timeLeft <= fiveMinutes) {
        onWarning()
        clearInterval(checkInterval)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(checkInterval)
  }, [expiresAt, onWarning])
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cookie-based sessions | JWT in localStorage | N/A (project design) | Simpler CORS, stateless |
| Single auth context | Separate admin context | This phase | Clear separation of concerns |

**Deprecated/outdated:**
- Partner portal concept: Removed in recent refactor (US-022, US-023)
- Old impersonation UI: References `/partner/dashboard` should be removed

## API Endpoints Reference

The following admin endpoints are available from Phase 1:

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/admin/login` | POST | Authenticate admin | No |
| `/admin/logout` | POST | Invalidate session | Yes (admin-jwt) |
| `/admin/me` | GET | Get admin profile | Yes (admin-jwt) |
| `/admin/sessions/revoke-all` | POST | Revoke other sessions | Yes (admin-jwt) |

**Request/Response Examples:**

**POST /admin/login**
```json
// Request
{
  "email": "admin@nebula-dns.com",
  "password": "AdminSecureP@ssw0rd123!"
}

// Response (200 OK)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 28800,
  "admin": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@nebula-dns.com",
    "name": "System Administrator",
    "status": "active",
    "mfaSetupComplete": true
  }
}

// Response (401 Unauthorized)
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

## Claude's Discretion Recommendations

Based on research of existing patterns and security best practices:

### "Remember me" checkbox
**Recommendation:** Do NOT include for admin portal
**Rationale:** Admin portals should prioritize security over convenience. 8-hour sessions are already long. No "remember me" aligns with security best practices for privileged access.

### Logout confirmation dialog
**Recommendation:** Do NOT show confirmation
**Rationale:** Logout is a low-risk action. Users expect immediate logout. The existing tenant auth has no confirmation. Quick logout improves security (user can logout quickly if needed).

### State clearing on logout
**Recommendation:** Clear admin-specific state only
**Rationale:**
- Clear: `admin_token`, `admin_user`, `admin_session_expiry`
- Keep: Theme preference, any non-sensitive UI state
- This matches the tenant auth pattern in `AuthContext.tsx`

### Loading spinner design
**Recommendation:** Use existing `FullPageLoading` component
**Rationale:** Consistent with rest of application, already styled for dark/light mode

### "Access denied" message duration
**Recommendation:** 1.5 seconds before redirect
**Rationale:** Long enough to read but not frustrating. User understands they need to log in.

## Open Questions

Things that couldn't be fully resolved:

1. **Token refresh mechanism**
   - What we know: Tenant auth has 14-minute refresh interval, admin tokens are 8 hours
   - What's unclear: Should admin tokens have refresh, or just re-login?
   - Recommendation: For 8-hour tokens, no auto-refresh. Show session warning modal at 5 minutes remaining, let user extend session via new login if needed.

2. **Session storage vs localStorage**
   - What we know: Current tenant auth uses localStorage
   - What's unclear: Should admin use sessionStorage for extra security (closes with browser)?
   - Recommendation: Use localStorage to match existing patterns. Document as future security enhancement.

## Sources

### Primary (HIGH confidence)
- `api/src/modules/admin/admin.controller.ts` - Admin API endpoints
- `api/src/modules/admin/dto/admin-login.dto.ts` - Login request validation
- `api/src/modules/admin/dto/admin-response.dto.ts` - Response structures
- `ui/src/contexts/AuthContext.tsx` - Existing auth patterns
- `ui/src/app/page.tsx` - Login page implementation
- `ui/src/components/layout/TopNav.tsx` - Header with user dropdown

### Secondary (MEDIUM confidence)
- `ui/src/components/Toast.tsx` - Toast notification system
- `ui/src/components/ErrorBoundary.tsx` - Error handling patterns
- `ui/src/components/LoadingSpinner.tsx` - Loading states

### Tertiary (LOW confidence)
- None - all patterns verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new dependencies
- Architecture: HIGH - Clear patterns from existing AuthContext
- Pitfalls: HIGH - Based on actual codebase patterns and React best practices
- API endpoints: HIGH - Verified against actual controller code

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable patterns, no external dependencies)
