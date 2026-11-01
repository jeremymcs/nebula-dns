/**
 * Flux Shield — Design C auth layout (admin portal)
 */

'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldMark } from '@/components/ShieldMark'
import { ProductWordmark } from '@/components/ProductWordmark'
import { ProductFooter } from '@/components/ProductFooter'
import { ADMIN_PORTAL_NAME } from '@/lib/branding'
import clsx from 'clsx'

export interface AdminAuthShellProps {
  title: ReactNode
  subtitle?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md'
  eyebrow?: string
}

export function AdminAuthShell({
  title,
  subtitle,
  children,
  maxWidth = 'sm',
  eyebrow,
}: AdminAuthShellProps) {
  return (
    <div
      className="relative min-h-screen bg-canvas text-ink dark:bg-space-950 overflow-hidden"
      data-flux-auth-shell
    >
      <div className="pointer-events-none absolute inset-0 fs-hero-backdrop fs-hero-grid" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-10 sm:px-6">
        <header className="mb-8 flex w-full max-w-[420px] items-center gap-2.5">
          <Link href="/login" className="flex items-center gap-2.5">
            <ShieldMark className="h-9 w-9 rounded-[8px]" iconClassName="h-5 w-5" />
            <div className="leading-tight">
              <ProductWordmark className="text-[15px] font-semibold tracking-tight text-ink dark:text-white" />
              <p className="text-[11px] text-mut">{ADMIN_PORTAL_NAME}</p>
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
          <ProductFooter variant="auth" />
        </div>
      </div>
    </div>
  )
}

export function AdminAuthHeadingAccent({ children }: { children: ReactNode }) {
  return (
    <span className="font-serif italic bg-gradient-to-r from-[#1E3B78] via-[#4B7CBB] to-[#FF6E62] bg-clip-text text-transparent">
      {children}
    </span>
  )
}

export function AdminAuthErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-[10px] border fs-hairline bg-[#FFF5F4] px-3.5 py-3 text-sm text-[#9B3429] dark:bg-danger-900/20 dark:text-danger-300">
      {message}
    </div>
  )
}
