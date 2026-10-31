import clsx from 'clsx'

type ShieldMarkProps = {
  className?: string
  iconClassName?: string
}

/** Flux Shield mark — navy/blue shield with coral accent (matches favicon). */
export function ShieldMark({ className, iconClassName = 'h-6 w-6' }: ShieldMarkProps) {
  return (
    <div
      className={clsx(
        'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-700 to-primary-500 shadow-lg shadow-primary-700/25',
        className
      )}
    >
      <svg
        className={clsx(iconClassName, 'text-white')}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M12 2.5L4 6v7.2c0 4.6 3.1 8.8 8 10 4.9-1.2 8-5.4 8-10V6l-8-3.5z"
          fill="currentColor"
          fillOpacity={0.95}
        />
        <path
          d="M12 5.5l-3.5 1.6v4.8c0 2.7 1.6 5.2 3.5 6 1.9-.8 3.5-3.3 3.5-6V7.1L12 5.5z"
          fill="#4B7CBB"
          fillOpacity={0.45}
        />
        <circle cx="17.5" cy="6.5" r="1.35" fill="#FF6E62" />
      </svg>
    </div>
  )
}
