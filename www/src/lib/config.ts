// Marketing site configuration — public URLs from env (see public-urls.ts)
import { APP_ORIGIN, API_ORIGIN, WWW_ORIGIN } from '@/lib/public-urls'

export const API_URL =
  typeof window === 'undefined'
    ? process.env.API_URL || API_ORIGIN
    : '/backend'

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || APP_ORIGIN
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || WWW_ORIGIN
