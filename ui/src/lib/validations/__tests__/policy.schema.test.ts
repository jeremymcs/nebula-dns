// Nebula DNS - UI Policy Schema Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { policySchema, applyTemplateSchema, bulkPolicyActionSchema } from '../policy.schema'

describe('Policy Validation Schemas', () => {
  describe('policySchema', () => {
    const validPolicyData = {
      name: 'Block Social Media',
      description: 'Blocks social media sites during work hours',
      action: 'block' as const,
      priority: 50,
      enabled: true,
      categories: ['social-media'],
      logging: true,
      safesearch: false,
    }

    it('should validate correct policy data', () => {
      const result = policySchema.safeParse(validPolicyData)
      expect(result.success).toBe(true)
    })

    it('should reject short policy name', () => {
      const invalidData = {
        ...validPolicyData,
        name: 'AB',
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject policy name with special characters', () => {
      const invalidData = {
        ...validPolicyData,
        name: 'Block @#$ Social',
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept valid characters in name', () => {
      const validData = {
        ...validPolicyData,
        name: 'Block_Social-Media 2024',
      }
      const result = policySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject priority below 1', () => {
      const invalidData = {
        ...validPolicyData,
        priority: 0,
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject priority above 100', () => {
      const invalidData = {
        ...validPolicyData,
        priority: 101,
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate redirect action with URL', () => {
      const validData = {
        ...validPolicyData,
        action: 'redirect' as const,
        redirectUrl: 'https://example.com',
      }
      const result = policySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid redirect URL', () => {
      const invalidData = {
        ...validPolicyData,
        action: 'redirect' as const,
        redirectUrl: 'not-a-url',
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate with schedule', () => {
      const validData = {
        ...validPolicyData,
        schedule: {
          enabled: true,
          timezone: 'America/New_York',
          rules: [
            {
              days: ['mon', 'tue', 'wed', 'thu', 'fri'],
              startTime: '09:00',
              endTime: '17:00',
            },
          ],
        },
      }
      const result = policySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid time format', () => {
      const invalidData = {
        ...validPolicyData,
        schedule: {
          enabled: true,
          rules: [
            {
              days: ['mon'],
              startTime: '9:00', // Should be 09:00
              endTime: '17:00',
            },
          ],
        },
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject too many categories', () => {
      const invalidData = {
        ...validPolicyData,
        categories: Array(51).fill('category'),
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate with location IDs', () => {
      const validData = {
        ...validPolicyData,
        locationIds: ['550e8400-e29b-41d4-a716-446655440000'],
      }
      const result = policySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for location', () => {
      const invalidData = {
        ...validPolicyData,
        locationIds: ['not-a-uuid'],
      }
      const result = policySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('applyTemplateSchema', () => {
    const validTemplateData = {
      templateId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Applied Template',
      locationIds: ['550e8400-e29b-41d4-a716-446655440001'],
      enabled: true,
    }

    it('should validate correct template application', () => {
      const result = applyTemplateSchema.safeParse(validTemplateData)
      expect(result.success).toBe(true)
    })

    it('should require at least one location', () => {
      const invalidData = {
        ...validTemplateData,
        locationIds: [],
      }
      const result = applyTemplateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('bulkPolicyActionSchema', () => {
    it('should validate enable action', () => {
      const validData = {
        policyIds: ['550e8400-e29b-41d4-a716-446655440000'],
        action: 'enable' as const,
      }
      const result = bulkPolicyActionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate delete action with confirmation', () => {
      const validData = {
        policyIds: ['550e8400-e29b-41d4-a716-446655440000'],
        action: 'delete' as const,
        confirmDelete: true,
      }
      const result = bulkPolicyActionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require at least one policy ID', () => {
      const invalidData = {
        policyIds: [],
        action: 'enable' as const,
      }
      const result = bulkPolicyActionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
