// Nebula DNS - UI Auth Schema Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  loginSchema,
  signupSchema,
  mfaSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  changePasswordSchema,
} from '../auth.schema'

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      }
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should lowercase and trim email', () => {
      const data = {
        email: 'USER@EXAMPLE.COM',
        password: 'password123',
      }
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '',
      }
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('signupSchema', () => {
    const validSignupData = {
      email: 'user@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      fullName: 'John Doe',
      companyName: 'Acme Corp',
      planId: 'starter',
      billingCycle: 'monthly' as const,
      agreeTerms: true,
    }

    it('should validate correct signup data', () => {
      const result = signupSchema.safeParse(validSignupData)
      expect(result.success).toBe(true)
    })

    it('should reject weak password', () => {
      const invalidData = {
        ...validSignupData,
        password: 'weak',
        confirmPassword: 'weak',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password without uppercase', () => {
      const invalidData = {
        ...validSignupData,
        password: 'securepass123!',
        confirmPassword: 'securepass123!',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject password without special character', () => {
      const invalidData = {
        ...validSignupData,
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        ...validSignupData,
        confirmPassword: 'DifferentPass123!',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword')
      }
    })

    it('should reject without terms agreement', () => {
      const invalidData = {
        ...validSignupData,
        agreeTerms: false,
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject short company name', () => {
      const invalidData = {
        ...validSignupData,
        companyName: 'A',
      }
      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept optional fields', () => {
      const dataWithOptionals = {
        ...validSignupData,
        industry: 'technology',
        companySize: '11-50',
        country: 'US',
      }
      const result = signupSchema.safeParse(dataWithOptionals)
      expect(result.success).toBe(true)
    })
  })

  describe('mfaSchema', () => {
    it('should validate 6-digit code', () => {
      const validData = { code: '123456' }
      const result = mfaSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate 8-character backup code', () => {
      const validData = { code: 'ABC12345' }
      const result = mfaSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject short code', () => {
      const invalidData = { code: '12345' }
      const result = mfaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject code with special characters', () => {
      const invalidData = { code: '123-456' }
      const result = mfaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('passwordResetRequestSchema', () => {
    it('should validate email', () => {
      const validData = { email: 'user@example.com' }
      const result = passwordResetRequestSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = { email: 'invalid' }
      const result = passwordResetRequestSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('passwordResetSchema', () => {
    const validResetData = {
      token: 'valid-reset-token',
      password: 'NewSecure123!',
      confirmPassword: 'NewSecure123!',
    }

    it('should validate correct reset data', () => {
      const result = passwordResetSchema.safeParse(validResetData)
      expect(result.success).toBe(true)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        ...validResetData,
        confirmPassword: 'Different123!',
      }
      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    const validChangeData = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
      confirmPassword: 'NewPass123!',
    }

    it('should validate correct password change', () => {
      const result = changePasswordSchema.safeParse(validChangeData)
      expect(result.success).toBe(true)
    })

    it('should reject same old and new password', () => {
      const invalidData = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        confirmPassword: 'SamePass123!',
      }
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('newPassword')
      }
    })

    it('should reject mismatched new passwords', () => {
      const invalidData = {
        ...validChangeData,
        confirmPassword: 'Different123!',
      }
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
