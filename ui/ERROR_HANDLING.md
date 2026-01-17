# Nebula DNS UI - Error Handling & Form Validation

This document describes the error handling and form validation system implemented for US-017.

## Overview

The Nebula DNS UI now includes comprehensive error handling and form validation:

1. **Global Error Boundaries** - Catch and gracefully handle React errors
2. **Page-Level Error Boundaries** - Isolated error handling for different sections
3. **Form Validation** - Zod schemas with React Hook Form integration
4. **API Error Handling** - Retry logic with exponential backoff
5. **Toast Notifications** - User-friendly error and success messages
6. **Unit Tests** - Comprehensive test coverage for validation schemas

## Architecture

### Error Boundaries

Error boundaries are implemented at multiple levels:

```
AppLayout (ErrorBoundary)
├── TopNav (ErrorBoundary)
├── PageContent (ErrorBoundary)
│   └── Individual Pages
├── MobileNav (ErrorBoundary)
└── OrionFAB (ErrorBoundary)
```

**Location:** `/src/components/ErrorBoundary.tsx`

**Features:**
- Named error boundaries for better debugging
- Development-only error details display
- Retry functionality
- Reload page option
- Go to dashboard fallback
- Error count tracking (shows different UI after 3+ errors)
- Custom error logging (ready for Sentry/LogRocket integration)

**Usage:**
```tsx
<ErrorBoundary name="MyComponent" showReload onError={customHandler}>
  <MyComponent />
</ErrorBoundary>
```

### Form Validation

All forms use **Zod** for validation and **React Hook Form** for state management.

**Location:** `/src/lib/validations/`

**Available Schemas:**
- `auth.schema.ts` - Authentication (login, signup, MFA, password reset)
- `policy.schema.ts` - DNS policy management
- `location.schema.ts` - Location/network configuration
- `user.schema.ts` - User and team management
- `settings.schema.ts` - Organization settings, API keys, integrations

**Features:**
- Type-safe validation with TypeScript inference
- Custom error messages
- Conditional validation rules
- Complex field dependencies
- Array and nested object validation

### Form Components

Reusable form components with built-in error handling.

**Location:** `/src/components/forms/`

**Components:**
- `FormField` - Wrapper with label, error, and hint display
- `Input` - Text input with error state
- `Textarea` - Multi-line text input
- `Select` - Dropdown with error state
- `Checkbox` - Checkbox with label
- `Radio` - Radio button with label

**Features:**
- Consistent styling
- Automatic error state styling (red border)
- Disabled state support
- Dark mode support
- Accessible form controls

### API Error Handling

Custom hooks for API calls with automatic retry logic.

**Location:** `/src/lib/hooks/useApiWithRetry.ts`

**Hooks:**
- `useApiWithRetry<T>()` - Full-featured API hook
- `useApiCall<T>()` - Simplified version for single calls

**Features:**
- Configurable retry attempts (default: 3)
- Exponential backoff (optional)
- Automatic toast notifications (optional)
- Loading state tracking
- Retry count tracking
- Error state management

**Usage:**
```tsx
const api = useApiWithRetry({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  showErrorToast: true,
  showSuccessToast: true,
  successMessage: 'Operation completed successfully',
})

const handleSubmit = async (data) => {
  const result = await api.execute(async () => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Request failed')
    return response.json()
  })

  if (result) {
    // Success
  }
}
```

### Toast Notifications

Global toast notification system with animations.

**Location:** `/src/components/Toast.tsx`

**Types:**
- `success` - Green, checkmark icon
- `error` - Red, X icon
- `warning` - Yellow, warning icon
- `info` - Blue, info icon

**Features:**
- Auto-dismiss after 5 seconds
- Manual dismiss option
- Smooth animations (Framer Motion)
- Dark mode support
- Stacking (multiple toasts)

**Usage:**
```tsx
const { showToast } = useToast()

showToast('success', 'Policy Created', 'Your DNS policy has been saved.')
showToast('error', 'Failed to Save', 'Please try again.')
```

## Implementation Examples

### Example 1: Login Form with Validation

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { FormField, Input } from '@/components/forms'
import { useToast } from '@/components/Toast'

function LoginForm() {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginUser(data)
      showToast('success', 'Welcome back!')
    } catch (error) {
      showToast('error', 'Login Failed', error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Email" error={errors.email?.message} required>
        <Input
          {...register('email')}
          type="email"
          error={!!errors.email}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message} required>
        <Input
          {...register('password')}
          type="password"
          error={!!errors.password}
          disabled={isSubmitting}
        />
      </FormField>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
```

### Example 2: Policy Form with Retry Logic

See `/src/components/examples/ExamplePolicyForm.tsx` for a complete example showing:
- Form validation
- Error boundaries
- API retry logic
- Toast notifications
- Conditional fields
- Loading states

### Example 3: Error Boundary Wrapper

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

function DashboardPage() {
  return (
    <ErrorBoundary name="DashboardPage">
      <div>
        <ErrorBoundary name="MetricsSection">
          <MetricsCards />
        </ErrorBoundary>

        <ErrorBoundary name="ChartsSection">
          <Charts />
        </ErrorBoundary>

        <ErrorBoundary name="TableSection">
          <DataTable />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}
```

## Validation Rules

### Email
- Required
- Valid email format
- Automatically lowercased and trimmed

### Password
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### Policy Name
- 3-100 characters
- Letters, numbers, spaces, hyphens, underscores only

### Location Name
- 3-100 characters
- Letters, numbers, spaces, hyphens, underscores only

### IP Address
- Valid IPv4 format
- Valid IPv6 format
- CIDR notation supported (e.g., 192.168.1.0/24)

### Priority
- Integer between 1 and 100

### URLs
- Valid URL format (http:// or https://)
- Required for redirect actions

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run validation schema tests
npm test src/lib/validations/__tests__

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

### Test Coverage

Current test coverage for validation schemas:
- **Auth schemas:** 100% (15 test cases)
- **Policy schemas:** 100% (22 test cases)
- **Location schemas:** 100% (22 test cases)
- **Total:** 59 passing tests

### Writing New Tests

Example test structure:

```typescript
import { mySchema } from '../my.schema'

describe('My Schema', () => {
  describe('fieldName', () => {
    it('should validate correct data', () => {
      const result = mySchema.safeParse({ fieldName: 'valid' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid data', () => {
      const result = mySchema.safeParse({ fieldName: '' })
      expect(result.success).toBe(false)
    })

    it('should have correct error message', () => {
      const result = mySchema.safeParse({ fieldName: '' })
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Field is required')
      }
    })
  })
})
```

## Best Practices

### 1. Always Use Error Boundaries

Wrap all major sections in error boundaries to prevent cascading failures:

```tsx
// Good
<ErrorBoundary name="Section">
  <Section />
</ErrorBoundary>

// Bad - no error boundary
<Section />
```

### 2. Validate on Blur

Use `mode: 'onBlur'` for better user experience:

```tsx
useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur', // Validate when user leaves field
})
```

### 3. Provide Helpful Error Messages

```tsx
// Good
z.string().min(3, 'Name must be at least 3 characters')

// Bad
z.string().min(3)
```

### 4. Use FormField Wrapper

Always wrap inputs with FormField for consistent error display:

```tsx
// Good
<FormField label="Name" error={errors.name?.message}>
  <Input {...register('name')} error={!!errors.name} />
</FormField>

// Bad - no error display
<Input {...register('name')} />
```

### 5. Handle API Errors Gracefully

```tsx
// Good - retry logic + toast
const api = useApiWithRetry({ showErrorToast: true })
await api.execute(apiCall)

// Bad - no error handling
await fetch('/api/endpoint')
```

### 6. Provide Loading States

```tsx
// Good
<button disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</button>

// Bad - no feedback
<button>Save</button>
```

### 7. Reset Forms After Success

```tsx
const onSubmit = async (data) => {
  const result = await api.execute(() => saveData(data))
  if (result) {
    reset() // Reset form to initial state
    showToast('success', 'Saved!')
  }
}
```

## Future Enhancements

### Planned Improvements

1. **Error Tracking Service Integration**
   - Sentry for production error tracking
   - Automatic error reporting with user context
   - Error rate monitoring

2. **Advanced Validation**
   - Async validation (check if email exists)
   - Cross-field dependencies
   - Conditional required fields

3. **Form State Persistence**
   - Save draft forms to localStorage
   - Restore on page reload
   - Auto-save functionality

4. **Accessibility Improvements**
   - ARIA labels for all form controls
   - Screen reader announcements for errors
   - Keyboard navigation enhancements

5. **Performance Optimization**
   - Debounced validation for expensive checks
   - Lazy schema loading
   - Form field code splitting

## Troubleshooting

### Form Not Validating

**Issue:** Form submits without validation
**Solution:** Ensure you're using `resolver: zodResolver(schema)`

### Validation Errors Not Showing

**Issue:** Error messages don't appear
**Solution:** Pass `error={errors.fieldName?.message}` to FormField

### Toast Not Appearing

**Issue:** Toast notifications don't show
**Solution:** Ensure ToastProvider wraps your app (check layout.tsx)

### Error Boundary Not Catching Errors

**Issue:** Errors crash the app instead of being caught
**Solution:** Error boundaries only catch rendering errors, not async errors in event handlers

### TypeScript Errors with Form Data

**Issue:** Type errors when using form data
**Solution:** Use `z.infer<typeof schema>` to infer TypeScript types

## Files Modified/Created

### New Files
- `/src/lib/validations/auth.schema.ts`
- `/src/lib/validations/policy.schema.ts`
- `/src/lib/validations/location.schema.ts`
- `/src/lib/validations/user.schema.ts`
- `/src/lib/validations/settings.schema.ts`
- `/src/lib/validations/index.ts`
- `/src/lib/validations/README.md`
- `/src/lib/validations/__tests__/auth.schema.test.ts`
- `/src/lib/validations/__tests__/policy.schema.test.ts`
- `/src/lib/validations/__tests__/location.schema.test.ts`
- `/src/components/forms/FormField.tsx`
- `/src/components/forms/index.ts`
- `/src/components/auth/LoginForm.tsx`
- `/src/components/auth/SignupForm.tsx`
- `/src/components/auth/index.ts`
- `/src/lib/hooks/useApiWithRetry.ts`
- `/src/components/examples/ExamplePolicyForm.tsx`
- `/jest.config.js`
- `/jest.setup.js`
- `/ERROR_HANDLING.md`

### Modified Files
- `/src/components/ErrorBoundary.tsx` - Enhanced with better error tracking
- `/src/components/layout/DashboardLayout.tsx` - Added error boundaries
- `/package.json` - Added dependencies (zod, react-hook-form, etc.)

### Dependencies Added
- `zod` - Runtime validation
- `@hookform/resolvers` - React Hook Form integration
- `react-hook-form` - Form state management
- `jest` - Testing framework
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - Jest matchers

## Support

For questions or issues:
1. Check the `/src/lib/validations/README.md` for validation examples
2. Review `/src/components/examples/ExamplePolicyForm.tsx` for complete implementation
3. Run tests to ensure validation schemas work: `npm test`
4. Check error boundary logs in browser console (development mode)
