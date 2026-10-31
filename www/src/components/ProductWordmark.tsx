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
  const accentClass = accentClassName + (accent && !accent.startsWith(' ') ? ' ml-0.5' : '')
  return (
    <span className={className}>
      <span className={leadClassName}>{lead}</span>
      {accent ? (
        <span className={accentClass}>
          {accent.startsWith(' ') ? accent : ` ${accent}`}
        </span>
      ) : null}
    </span>
  )
}
