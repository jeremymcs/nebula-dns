import {
  DEFAULT_APP_ORIGIN,
  DEFAULT_API_ORIGIN,
  DEFAULT_DNS1_HOST,
  DEFAULT_DNS2_HOST,
  DEFAULT_WWW_ORIGIN,
} from '../../../shared/public-url-defaults'

export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || DEFAULT_APP_ORIGIN

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || DEFAULT_API_ORIGIN

export const WWW_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || DEFAULT_WWW_ORIGIN

export const DNS1_HOST = process.env.NEXT_PUBLIC_DNS1_HOST || DEFAULT_DNS1_HOST
export const DNS2_HOST = process.env.NEXT_PUBLIC_DNS2_HOST || DEFAULT_DNS2_HOST
