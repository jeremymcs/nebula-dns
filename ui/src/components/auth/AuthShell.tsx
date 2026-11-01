/**
 * Flux Shield — Design C auth layout (login, signup, MFA, invites)
 */

'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldMark } from '@/components/ui/ShieldMark'
import { ProductWordmark } from '@/components/ui/ProductWordmark'
import { ProductFooter } from '@/components/ui/ProductFooter'
import { PRODUCT_TAGLINE } from '@/lib/branding'
import clsx from 'clsx'

export interface AuthShellProps {
  title: ReactNode
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md'
  eyebrow?: string
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'sm',
  eyebrow,
}: AuthShellProps) {
  return (
    <div
      className="relative min-h-screen bg-canvas text-ink dark:bg-space-950 dark:text-space-100 overflow-hidden"
      data-flux-auth-shell
    >
      <div className="pointer-events-none absolute inset-0 fs-hero-backdrop fs-hero-grid" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-10 sm:px-6">
        <header className="mb-8 flex w-full max-w-[420px] items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <ShieldMark className="h-9 w-9 rounded-[8px] shadow-none" iconClassName="h-5 w-5" />
            <div className="leading-tight">
              <ProductWordmark className="text-[15px] font-semibold tracking-tight text-ink dark:text-white" />
              <p className="text-[11px] text-mut">{PRODUCT_TAGLINE}</p>
            </div>
          </Link>
        </header>

        <main
          className={clsx(
            'w-full fs-card p-6 sm:p-8',
            maxWidth === 'md' ? 'max-w-md' : 'max-w-[420px]',
          )}
        >
          {eyebrow && <p className="fs-eyebrow mb-3">{eyebrow}</p>}
          <div className="mb-6">
            <h1 className="text-[1.625rem] font-semibold tracking-tight text-ink dark:text-white text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-txt dark:text-space-400">{subtitle}</p>
            )}
          </div>
          {children}
        </main>

        <div className="mt-8 w-full max-w-[420px]">
          {footer ?? <ProductFooter variant="auth" />}
        </div>
      </div>
    </div>
  )
}

/** Serif accent word for auth headings */
export function AuthHeadingAccent({ children }: { children: ReactNode }) {
  return (
    <span className="font-serif italic text-gradient bg-gradient-to-r from-[#1E3B78] via-[#4B7CBB] to-[#FF6E62] bg-clip-text text-transparent">
      {children}
    </span>
  )
}

export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="mb-5 rounded-[10px] border fs-hairline bg-[#FFF5F4] px-3.5 py-3 text-sm text-[#9B3429] dark:bg-danger-900/20 dark:text-danger-300"
      role="alert"
    >
      {message}
    </div>
  )
}
