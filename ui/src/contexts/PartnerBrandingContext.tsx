/**
 * Partner Branding Context
 * Loads and applies partner-specific branding dynamically
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface PartnerBranding {
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  accentColor: string
  companyName: string
  supportEmail: string
  supportUrl: string
}

interface PartnerBrandingContextType {
  branding: PartnerBranding | null
  isPartnerPortal: boolean
  loading: boolean
}

const defaultBranding: PartnerBranding = {
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#10b981',
  accentColor: '#14b8a6',
  companyName: 'Nebula DNS',
  supportEmail: '',
  supportUrl: '',
}

const PartnerBrandingContext = createContext<PartnerBrandingContextType>({
  branding: null,
  isPartnerPortal: false,
  loading: true,
})

export function usePartnerBranding() {
  return useContext(PartnerBrandingContext)
}

export function PartnerBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<PartnerBranding | null>(null)
  const [isPartnerPortal, setIsPartnerPortal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBranding()
  }, [])

  const loadBranding = () => {
    try {
      // Check if we're in partner portal
      const partnerData = localStorage.getItem('partner')
      if (partnerData) {
        const partner = JSON.parse(partnerData)
        setIsPartnerPortal(true)
        
        if (partner.branding) {
          setBranding({
            ...defaultBranding,
            ...partner.branding,
          })
          applyBrandingStyles(partner.branding)
        }
      }
    } catch {
      // Not in partner context
    } finally {
      setLoading(false)
    }
  }

  const applyBrandingStyles = (brandingData: Partial<PartnerBranding>) => {
    const root = document.documentElement
    
    if (brandingData.primaryColor) {
      // Convert hex to RGB for CSS variables
      const primary = hexToRgb(brandingData.primaryColor)
      if (primary) {
        root.style.setProperty('--partner-primary', brandingData.primaryColor)
        root.style.setProperty('--partner-primary-rgb', `${primary.r}, ${primary.g}, ${primary.b}`)
      }
    }
    
    if (brandingData.accentColor) {
      const accent = hexToRgb(brandingData.accentColor)
      if (accent) {
        root.style.setProperty('--partner-accent', brandingData.accentColor)
        root.style.setProperty('--partner-accent-rgb', `${accent.r}, ${accent.g}, ${accent.b}`)
      }
    }

    // Update favicon if provided
    if (brandingData.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = brandingData.faviconUrl
      }
    }

    // Update document title if company name provided
    if (brandingData.companyName) {
      document.title = `${brandingData.companyName} - Partner Portal`
    }
  }

  return (
    <PartnerBrandingContext.Provider value={{ branding, isPartnerPortal, loading }}>
      {children}
    </PartnerBrandingContext.Provider>
  )
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

