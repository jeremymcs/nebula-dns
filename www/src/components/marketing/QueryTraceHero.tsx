/**
 * Decorative query-path visual for the marketing homepage (Design C).
 * Illustrative only — no tenant-specific or dashboard metrics.
 */

const svgId = (name: string) => `qt-${name}`

export function QueryTraceHero() {
  const p1 = svgId('p1')
  const p2 = svgId('p2')
  const p3 = svgId('p3')
  const dots = svgId('dots')
  const bl = svgId('bl')

  return (
    <div
      className="relative mx-auto mt-16 w-full max-w-[1200px] overflow-hidden rounded-t-[20px] fs-glass-panel"
      style={{ height: 470 }}
      aria-hidden
    >
      <div className="flex h-11 items-center gap-2 border-b border-[var(--fs-line)] px-[18px] text-xs text-[var(--fs-mut)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E7EE]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E7EE]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#E4E7EE]" />
        <span className="ml-4 font-mono text-xs">live query path</span>
        <span className="ml-auto flex items-center gap-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#2FB67C] before:shadow-[0_0_0_3px_rgba(47,182,124,0.15)] before:content-['']">
          Live
        </span>
      </div>

      <svg
        className="absolute left-0 top-11 h-[calc(100%-44px)] w-full"
        viewBox="0 0 1200 426"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={p1} x1="0" x2="1">
            <stop offset="0" stopColor="#4B7CBB" stopOpacity={0.2} />
            <stop offset="1" stopColor="#4B7CBB" />
          </linearGradient>
          <linearGradient id={p2} x1="0" x2="1">
            <stop offset="0" stopColor="#4B7CBB" />
            <stop offset="1" stopColor="#FF6E62" />
          </linearGradient>
          <linearGradient id={p3} x1="0" x2="1">
            <stop offset="0" stopColor="#4B7CBB" />
            <stop offset="1" stopColor="#2FB67C" />
          </linearGradient>
          <pattern id={dots} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" style={{ fill: 'var(--fs-line)' }} />
          </pattern>
          <filter id={bl}>
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width="1200" height="426" fill={`url(#${dots})`} />
        <path
          d="M230 96 C 330 96, 340 200, 430 205"
          stroke={`url(#${p1})`}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M230 210 C 330 210, 340 207, 430 207"
          stroke={`url(#${p1})`}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M230 322 C 330 322, 340 212, 430 209"
          stroke={`url(#${p1})`}
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M610 207 L 690 207" stroke="#4B7CBB" strokeWidth="1.5" />
        <path
          d="M850 200 C 920 200, 930 120, 990 116"
          stroke={`url(#${p3})`}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M850 214 C 920 214, 930 300, 990 304"
          stroke={`url(#${p2})`}
          strokeWidth="2.5"
          fill="none"
        />
        <circle cx="958" cy="290" r="10" fill="#FF6E62" opacity={0.35} filter={`url(#${bl})`} />
        <circle cx="958" cy="292" r="3.5" fill="#FF6E62" />
        <circle cx="660" cy="207" r="3" fill="#4B7CBB" />
        <circle cx="330" cy="150" r="2.5" fill="#4B7CBB" />
        <g transform="translate(770,207)">
          <circle r="74" fill="none" style={{ stroke: 'var(--fs-line)' }} />
          <circle r="52" style={{ fill: 'var(--fs-panel)', stroke: 'var(--fs-line)' }} />
          <circle
            r="74"
            fill="none"
            stroke={`url(#${p2})`}
            strokeWidth="1.5"
            strokeDasharray="120 345"
            transform="rotate(-30)"
          />
          <path
            d="M0 -26 L-20 -17.5 V-2 C-20 11 -11 22 0 25 C11 22 20 11 20 -2 V-17.5 Z"
            style={{ fill: 'rgb(var(--fs-c-action))' }}
          />
          <circle cx="13" cy="-16" r="4" fill="#FF6E62" strokeWidth="1.5" style={{ stroke: 'var(--fs-panel)' }} />
        </g>
      </svg>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-[13px] shadow-[0_0_0_1px_rgba(11,21,48,0.08),0_8px_20px_-8px_rgba(11,21,48,0.18)]"
        style={{ left: 56, top: 110, width: 176 }}
      >
        <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--fs-mut)]">
          Client device
        </div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">Workstation</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--fs-mut)]">On network</div>
      </div>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-[13px] shadow-[0_0_0_1px_rgba(11,21,48,0.08),0_8px_20px_-8px_rgba(11,21,48,0.18)]"
        style={{ left: 56, top: 222, width: 176 }}
      >
        <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--fs-mut)]">
          Roaming agent
        </div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">Mobile agent</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--fs-mut)]">Off-network</div>
      </div>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-[13px] shadow-[0_0_0_1px_rgba(11,21,48,0.08),0_8px_20px_-8px_rgba(11,21,48,0.18)]"
        style={{ left: 56, top: 334, width: 176 }}
      >
        <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--fs-mut)]">
          Branch office
        </div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">Shared PC</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--fs-mut)]">On network</div>
      </div>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-[13px] shadow-[0_0_0_1px_rgba(11,21,48,0.08),0_8px_20px_-8px_rgba(11,21,48,0.18)]"
        style={{ left: 432, top: 206, width: 178 }}
      >
        <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--fs-mut)]">
          Anycast edge
        </div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">Edge resolver</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--fs-mut)]">Query received</div>
      </div>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-center text-[13px] shadow-[0_0_0_1px_rgba(11,21,48,0.08),0_8px_20px_-8px_rgba(11,21,48,0.18)]"
        style={{ left: 700, top: 338, width: 150 }}
      >
        <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--fs-mut)]">
          Policy engine
        </div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">Threat protection</div>
      </div>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-[13px] shadow-[0_0_0_1px_rgba(11,21,48,0.08),0_8px_20px_-8px_rgba(11,21,48,0.18)]"
        style={{ left: 990, top: 118, width: 180 }}
      >
        <div className="font-mono text-[10.5px] text-[var(--fs-success)]">● Resolved</div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">example.com</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--fs-mut)]">Allowed</div>
      </div>

      <div
        className="absolute rounded-xl bg-panel p-3 px-3.5 text-[13px] shadow-[0_0_0_1px_#FFD9D4,0_12px_28px_-10px_rgba(255,110,98,0.45)]"
        style={{ left: 990, top: 306, width: 180 }}
      >
        <div className="font-mono text-[10.5px] text-[var(--fs-danger)]">● Blocked · phishing</div>
        <div className="mt-1 font-medium text-[var(--fs-ink)]">suspicious-site.test</div>
        <div className="mt-0.5 font-mono text-[11.5px] text-[var(--fs-mut)]">→ Custom block page</div>
      </div>
    </div>
  )
}
