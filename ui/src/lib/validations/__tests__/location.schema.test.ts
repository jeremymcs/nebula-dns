// Nebula DNS - UI Location Schema Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { locationSchema, networkLocationSchema } from '../location.schema'

describe('Location Validation Schemas', () => {
  describe('locationSchema', () => {
    const validLocationData = {
      name: 'Office Network',
      description: 'Main office location',
      type: 'network' as const,
      enabled: true,
      sourceIps: ['192.168.1.0/24'],
    }

    it('should validate correct location data', () => {
      const result = locationSchema.safeParse(validLocationData)
      expect(result.success).toBe(true)
    })

    it('should reject short location name', () => {
      const invalidData = {
        ...validLocationData,
        name: 'AB',
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject location name with special characters', () => {
      const invalidData = {
        ...validLocationData,
        name: 'Office @#$ Network',
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate IPv4 addresses', () => {
      const validData = {
        ...validLocationData,
        sourceIps: ['192.168.1.1', '10.0.0.1', '172.16.0.1'],
      }
      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid IPv4 address', () => {
      const invalidData = {
        ...validLocationData,
        sourceIps: ['999.999.999.999'],
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate CIDR notation', () => {
      const validData = {
        ...validLocationData,
        sourceIps: ['192.168.1.0/24', '10.0.0.0/16'],
      }
      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid CIDR', () => {
      const invalidData = {
        ...validLocationData,
        sourceIps: ['192.168.1.0/33'], // /33 is invalid
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate IPv6 addresses', () => {
      const validData = {
        ...validLocationData,
        sourceIps: ['2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
      }
      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate rate limiting', () => {
      const validData = {
        ...validLocationData,
        rateLimit: {
          enabled: true,
          maxQueriesPerMinute: 1000,
        },
      }
      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject rate limit below minimum', () => {
      const invalidData = {
        ...validLocationData,
        rateLimit: {
          enabled: true,
          maxQueriesPerMinute: 5,
        },
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject rate limit above maximum', () => {
      const invalidData = {
        ...validLocationData,
        rateLimit: {
          enabled: true,
          maxQueriesPerMinute: 15000,
        },
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate country code', () => {
      const validData = {
        ...validLocationData,
        country: 'US',
      }
      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid country code length', () => {
      const invalidData = {
        ...validLocationData,
        country: 'USA', // Should be 2 characters
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate tags', () => {
      const validData = {
        ...validLocationData,
        tags: ['production', 'office', 'main'],
      }
      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject too many tags', () => {
      const invalidData = {
        ...validLocationData,
        tags: Array(11).fill('tag'),
      }
      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('networkLocationSchema', () => {
    it('should validate network location', () => {
      const validData = {
        name: 'Office Network',
        type: 'network' as const,
        enabled: true,
        sourceIps: ['192.168.1.0/24'],
      }
      const result = networkLocationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require sourceIps for network type', () => {
      const invalidData = {
        name: 'Office Network',
        type: 'network' as const,
        enabled: true,
      }
      const result = networkLocationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty sourceIps array', () => {
      const invalidData = {
        name: 'Office Network',
        type: 'network' as const,
        enabled: true,
        sourceIps: [],
      }
      const result = networkLocationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
