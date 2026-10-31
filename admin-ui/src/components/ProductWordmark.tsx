import clsx from 'clsx'
import { PRODUCT_WORDMARK } from '@/lib/branding'

type ProductWordmarkProps = {
  className?: string
  leadClassName?: string
  accentClassName?: string
}

export function ProductWordmark({
  className,
  leadClassName,
  accentClassName = 'text-gradient',
}: ProductWordmarkProps) {
  const { lead, accent } = PRODUCT_WORDMARK
  return (
    <span className={className}>
      <span className={leadClassName}>{lead}</span>
      {accent ? (
        <span className={clsx(accentClassName, 'ml-0.5')}>{accent.startsWith(' ') ? accent : ` ${accent}`}</span>
      ) : null}
    </span>
  )
}
