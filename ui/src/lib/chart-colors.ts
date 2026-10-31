/** Flux Labs chart palette (status/series only — not primary UI chrome) */
export const FLUX_CHART_COLORS = [
  '#4B7CBB', // flux blue
  '#FF6E62', // salmon
  '#1E3B78', // navy
  '#10b981', // success
  '#ffb84d', // chart amber
  '#7d8dff', // chart violet
  '#ff4f81', // chart pink
  '#475467', // muted
] as const

export const FLUX_CHART = {
  queries: '#4B7CBB',
  blocked: '#ff4f81',
  success: '#10b981',
} as const
