/**
 * Light canvas wrapper for marketing / legal content pages
 */

import clsx from 'clsx'

export function MarketingPageShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={clsx('bg-canvas text-ink', className)}>{children}</div>
}

/** Card surface for marketing content blocks */
export function MarketingCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('fs-card rounded-[14px] p-6 sm:p-8', className)}>{children}</div>
  )
}
