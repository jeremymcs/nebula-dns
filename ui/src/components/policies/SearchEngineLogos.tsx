/**
 * Nebula DNS - Search Engine Logo Components
 * SVG logos for search engine safe search settings
 */

import React from 'react'

export const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export const BingLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3v16.5l4.5 2.5 8-4.5v-5l-6-2.5-2.5 1.5V5.5L5 3zm4.5 11l4 1.5v2l-4 2.5V14z" fill="#00897B"/>
  </svg>
)

export const YouTubeLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
  </svg>
)

export const DuckDuckGoLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#DE5833"/>
    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" fill="#DE5833"/>
    <ellipse cx="9" cy="10" rx="2" ry="2.5" fill="#fff"/>
    <ellipse cx="15" cy="10" rx="2" ry="2.5" fill="#fff"/>
    <circle cx="9.5" cy="10" r="1" fill="#000"/>
    <circle cx="15.5" cy="10" r="1" fill="#000"/>
    <path d="M8 15c0 0 2 2 4 2s4-2 4-2" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round"/>
  </svg>
)

export const SEARCH_ENGINE_LOGOS: Record<string, React.FC> = {
  google: GoogleLogo,
  bing: BingLogo,
  youtube: YouTubeLogo,
  duckduckgo: DuckDuckGoLogo,
}

export default SEARCH_ENGINE_LOGOS
