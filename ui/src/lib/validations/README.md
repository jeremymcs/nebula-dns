# Nebula DNS - Form Validation Guide

This directory contains Zod validation schemas for all forms in the Nebula DNS UI.

## Overview

We use **Zod** for runtime validation and **React Hook Form** for form management. This provides:
- Type-safe form validation
- Automatic TypeScript types from schemas
- Client-side validation with instant feedback
- Easy integration with API error handling

## Available Schemas

### Authentication (`auth.schema.ts`)
- `loginSchema` - Login form
- `signupSchema` - User registration
- `mfaSchema` - Multi-factor authentication
- `passwordResetRequestSchema` - Request password reset
- `passwordResetSchema` - Reset password with token
- `changePasswordSchema` - Change current password

### Policies (`policy.schema.ts`)
- `policySchema` - Create/edit DNS policies
- `applyTemplateSchema` - Apply policy templates
- `bulkPolicyActionSchema` - Bulk policy operations
- `policyFilterSchema` - Policy search/filter

### Locations (`location.schema.ts`)
- `locationSchema` - Generic location form
- `networkLocationSchema` - Network-type locations
- `deviceLocationSchema` - Device-type locations
- `roamingLocationSchema` - Roaming locations
- `bulkLocationActionSchema` - Bulk location operations
- `locationFilterSchema` - Location search/filter

### Users (`user.schema.ts`)
- `userInviteSchema` - Invite new users
- `userUpdateSchema` - Update user details
- `userProfileSchema` - User profile editing
- `bulkUserActionSchema` - Bulk user operations
- `teamMemberSchema` - Team member management

### Settings (`settings.schema.ts`)
- `organizationSettingsSchema` - Organization settings
- `apiKeySchema` - API key creation
- `ssoConfigSchema` - SSO configuration
- `webhookSchema` - Webhook setup
- `siemIntegrationSchema` - SIEM integration
- `blockPageSchema` - Block page customization
- `notificationPreferencesSchema` - Notification settings

## Usage Examples

### Basic Form with Validation

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { policySchema, type PolicyFormData } from '@/lib/validations'
import { FormField, Input, Select } from '@/components/forms'
import { useToast } from '@/components/Toast'

function CreatePolicyForm() {
  const { showToast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    mode: 'onBlur', // Validate on blur
    defaultValues: {
      priority: 50,
      enabled: true,
      logging: true,
    },
  })

  const onSubmit = async (data: PolicyFormData) => {
    try {
      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to create policy')

      showToast('success', 'Policy Created', 'Your policy has been saved.')
    } catch (error) {
      showToast('error', 'Error', error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Policy Name" error={errors.name?.message} required>
        <Input
          {...register('name')}
          placeholder="Block Social Media"
          error={!!errors.name}
        />
      </FormField>

      <FormField label="Action" error={errors.action?.message} required>
        <Select {...register('action')} error={!!errors.action}>
          <option value="allow">Allow</option>
          <option value="block">Block</option>
          <option value="redirect">Redirect</option>
        </Select>
      </FormField>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Policy'}
      </button>
    </form>
  )
}
```

### Form with API Error Handling and Retry

```tsx
import { useApiWithRetry } from '@/lib/hooks/useApiWithRetry'

function UserInviteForm() {
  const api = useApiWithRetry({
    maxRetries: 3,
    showErrorToast: true,
    showSuccessToast: true,
    successMessage: 'User invited successfully',
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInviteFormData>({
    resolver: zodResolver(userInviteSchema),
  })

  const onSubmit = async (data: UserInviteFormData) => {
    await api.execute(async () => {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to invite user')
      }

      return response.json()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      {api.error && (
        <div className="text-danger-600">
          Error: {api.error.message}
          {api.retryCount > 0 && ` (Retry ${api.retryCount}/${3})`}
        </div>
      )}
      <button type="submit" disabled={api.loading}>
        {api.loading ? 'Sending...' : 'Invite User'}
      </button>
    </form>
  )
}
```

### Validation-Only (No Form)

```tsx
import { loginSchema } from '@/lib/validations'

function validateCredentials(email: string, password: string) {
  const result = loginSchema.safeParse({ email, password })

  if (!result.success) {
    // result.error.issues contains validation errors
    console.error(result.error.issues)
    return false
  }

  // result.data is typed as LoginFormData
  console.log('Valid credentials:', result.data)
  return true
}
```

## Form Components

Located in `/src/components/forms/`:

### FormField
Wrapper component that provides label, error message, and hint display.

```tsx
<FormField
  label="Email Address"
  error={errors.email?.message}
  hint="We'll never share your email"
  required
>
  <Input {...register('email')} />
</FormField>
```

### Input
Styled text input with error state support.

```tsx
<Input
  {...register('name')}
  type="text"
  placeholder="Enter name"
  error={!!errors.name}
  disabled={isSubmitting}
/>
```

### Textarea
Styled multi-line text input.

```tsx
<Textarea
  {...register('description')}
  placeholder="Enter description"
  error={!!errors.description}
/>
```

### Select
Styled dropdown select.

```tsx
<Select {...register('role')} error={!!errors.role}>
  <option value="admin">Admin</option>
  <option value="user">User</option>
</Select>
```

### Checkbox
Styled checkbox with label.

```tsx
<Checkbox
  {...register('agreeTerms')}
  label="I agree to the terms and conditions"
/>
```

## Testing

All validation schemas have comprehensive unit tests in `__tests__/` directories.

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## Error Handling Best Practices

1. **Always use FormField wrapper** - It automatically displays validation errors
2. **Set validation mode** - Use `mode: 'onBlur'` for better UX
3. **Provide default values** - Prevents uncontrolled input warnings
4. **Use TypeScript types** - Infer types from schemas with `z.infer<typeof schema>`
5. **Handle API errors** - Use `useToast` to show user-friendly error messages
6. **Implement retry logic** - Use `useApiWithRetry` for resilient API calls

## Adding New Schemas

1. Create schema file in this directory (e.g., `feature.schema.ts`)
2. Define Zod schemas with proper validation rules
3. Export TypeScript types using `z.infer`
4. Add to `index.ts` for easier imports
5. Write comprehensive tests in `__tests__/`
6. Update this README with usage examples

## Common Patterns

### Conditional Validation

```tsx
const schema = z.object({
  action: z.enum(['allow', 'block', 'redirect']),
  redirectUrl: z.string().url().optional(),
}).refine(
  (data) => data.action !== 'redirect' || data.redirectUrl,
  {
    message: 'Redirect URL is required when action is redirect',
    path: ['redirectUrl'],
  }
)
```

### Password Confirmation

```tsx
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
)
```

### Array Validation

```tsx
const schema = z.object({
  categories: z.array(z.string())
    .min(1, 'Select at least one category')
    .max(10, 'Maximum 10 categories allowed'),
})
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Resolver](https://github.com/react-hook-form/resolvers#zod)
