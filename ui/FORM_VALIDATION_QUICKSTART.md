# Form Validation Quick Start Guide

Quick reference for implementing validated forms in Nebula DNS UI.

## Basic Form Setup (5 steps)

### 1. Import Dependencies
```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mySchema, type MyFormData } from '@/lib/validations'
import { FormField, Input } from '@/components/forms'
import { useToast } from '@/components/Toast'
```

### 2. Initialize Form
```tsx
const { showToast } = useToast()
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  watch,
  reset,
} = useForm<MyFormData>({
  resolver: zodResolver(mySchema),
  mode: 'onBlur',
  defaultValues: {
    field1: 'default value',
  },
})
```

### 3. Create Submit Handler
```tsx
const onSubmit = async (data: MyFormData) => {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error('Request failed')

    showToast('success', 'Success!', 'Data saved successfully.')
    reset() // Reset form
  } catch (error) {
    showToast('error', 'Error', error.message)
  }
}
```

### 4. Build Form JSX
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  <FormField label="Field Name" error={errors.fieldName?.message} required>
    <Input
      {...register('fieldName')}
      placeholder="Enter value"
      error={!!errors.fieldName}
      disabled={isSubmitting}
    />
  </FormField>

  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save'}
  </button>
</form>
```

### 5. Wrap in Error Boundary
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

<ErrorBoundary name="MyForm">
  <MyFormComponent />
</ErrorBoundary>
```

## Common Patterns

### Text Input
```tsx
<FormField label="Name" error={errors.name?.message} required>
  <Input {...register('name')} error={!!errors.name} />
</FormField>
```

### Textarea
```tsx
<FormField label="Description" error={errors.description?.message}>
  <Textarea {...register('description')} error={!!errors.description} />
</FormField>
```

### Select Dropdown
```tsx
<FormField label="Type" error={errors.type?.message} required>
  <Select {...register('type')} error={!!errors.type}>
    <option value="">Select...</option>
    <option value="option1">Option 1</option>
    <option value="option2">Option 2</option>
  </Select>
</FormField>
```

### Checkbox
```tsx
<FormField error={errors.agree?.message}>
  <Checkbox {...register('agree')} label="I agree to terms" />
</FormField>
```

### Number Input
```tsx
<FormField label="Priority" error={errors.priority?.message}>
  <Input
    {...register('priority', { valueAsNumber: true })}
    type="number"
    min={1}
    max={100}
    error={!!errors.priority}
  />
</FormField>
```

### Password Input
```tsx
<FormField label="Password" error={errors.password?.message} required>
  <Input
    {...register('password')}
    type="password"
    autoComplete="new-password"
    error={!!errors.password}
  />
</FormField>
```

## Advanced Patterns

### Conditional Fields
```tsx
const selectedType = watch('type')

{selectedType === 'redirect' && (
  <FormField label="Redirect URL" error={errors.redirectUrl?.message}>
    <Input {...register('redirectUrl')} type="url" error={!!errors.redirectUrl} />
  </FormField>
)}
```

### API Retry Logic
```tsx
import { useApiWithRetry } from '@/lib/hooks/useApiWithRetry'

const api = useApiWithRetry({
  maxRetries: 3,
  showErrorToast: true,
  successMessage: 'Saved!',
})

const onSubmit = async (data: MyFormData) => {
  const result = await api.execute(async () => {
    const res = await fetch('/api/endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed')
    return res.json()
  })

  if (result) reset()
}

// In JSX:
<button disabled={api.loading}>
  {api.loading ? 'Saving...' : 'Save'}
</button>
```

### Form Reset
```tsx
// Reset to initial values
reset()

// Reset with new values
reset({
  field1: 'new value',
  field2: 'another value',
})

// Partial reset
reset({ field1: 'new value' }, { keepDefaultValues: true })
```

### Watch Field Values
```tsx
// Watch single field
const email = watch('email')

// Watch multiple fields
const [email, password] = watch(['email', 'password'])

// Watch all fields
const formValues = watch()
```

### Custom Validation
```tsx
<Input
  {...register('customField', {
    validate: (value) => {
      if (value.length < 5) return 'Too short'
      if (value.includes('bad')) return 'Invalid word'
      return true
    }
  })}
/>
```

## Available Schemas

### Authentication
```tsx
import {
  loginSchema,
  signupSchema,
  mfaSchema,
  passwordResetSchema,
  changePasswordSchema,
} from '@/lib/validations'
```

### Policies
```tsx
import {
  policySchema,
  applyTemplateSchema,
  bulkPolicyActionSchema,
} from '@/lib/validations'
```

### Locations
```tsx
import {
  locationSchema,
  networkLocationSchema,
  deviceLocationSchema,
  bulkLocationActionSchema,
} from '@/lib/validations'
```

### Users
```tsx
import {
  userInviteSchema,
  userUpdateSchema,
  userProfileSchema,
  bulkUserActionSchema,
} from '@/lib/validations'
```

### Settings
```tsx
import {
  organizationSettingsSchema,
  apiKeySchema,
  ssoConfigSchema,
  webhookSchema,
  blockPageSchema,
} from '@/lib/validations'
```

## Creating New Schema

```tsx
// In /src/lib/validations/myfeature.schema.ts
import { z } from 'zod'

export const mySchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number()
    .int('Age must be a whole number')
    .min(18, 'Must be 18 or older'),
  agree: z.boolean()
    .refine((val) => val === true, 'You must agree'),
})

export type MyFormData = z.infer<typeof mySchema>
```

## Common Validation Rules

### Email
```tsx
z.string().email('Invalid email')
```

### Required String
```tsx
z.string().min(1, 'Field is required')
```

### String Length
```tsx
z.string().min(3).max(100)
```

### Number Range
```tsx
z.number().min(1).max(100)
```

### URL
```tsx
z.string().url('Invalid URL')
```

### UUID
```tsx
z.string().uuid('Invalid ID')
```

### Enum
```tsx
z.enum(['option1', 'option2', 'option3'])
```

### Array
```tsx
z.array(z.string()).min(1).max(10)
```

### Optional
```tsx
z.string().optional()
z.string().nullable()
```

### Password Matching
```tsx
z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
```

### IP Address
```tsx
z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP address')
```

## Troubleshooting

### Validation Not Working
✅ Check: Using `resolver: zodResolver(schema)`?
✅ Check: Schema imported correctly?

### Errors Not Showing
✅ Check: Passing `error={errors.field?.message}` to FormField?
✅ Check: Using `error={!!errors.field}` on Input?

### Type Errors
✅ Use `z.infer<typeof schema>` for TypeScript type
✅ Check: Form data type matches schema?

### Form Not Resetting
✅ Call `reset()` after successful submit
✅ Check: Using correct default values?

## Best Practices

1. ✅ Always use FormField wrapper
2. ✅ Validate on blur (`mode: 'onBlur'`)
3. ✅ Provide helpful error messages
4. ✅ Show loading states
5. ✅ Reset form on success
6. ✅ Use error boundaries
7. ✅ Handle API errors with toasts
8. ✅ Add retry logic for critical operations
9. ✅ Write tests for schemas
10. ✅ Use TypeScript for type safety

## Need Help?

1. Check `/src/lib/validations/README.md` for detailed docs
2. See `/src/components/examples/ExamplePolicyForm.tsx` for complete example
3. Read `/ui/ERROR_HANDLING.md` for error handling guide
4. Run tests: `npm test src/lib/validations/__tests__`
