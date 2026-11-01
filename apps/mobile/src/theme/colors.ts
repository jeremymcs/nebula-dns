export const fluxColors = {
  navy: '#1E3B78',
  blue: '#4B7CBB',
  coral: '#FF6E62',
  navyDeep: '#0c1424',
  text: '#101828',
  muted: '#475467',
  white: '#FFFFFF',
  success: '#10b981',
  warning: '#ffb84d',
  danger: '#e85a4f',
} as const;

export type ColorScheme = 'light' | 'dark';

export function getTheme(scheme: ColorScheme) {
  const dark = scheme === 'dark';
  return {
    scheme,
    colors: {
      background: dark ? fluxColors.navyDeep : '#f9fafb',
      surface: dark ? '#182f61' : fluxColors.white,
      text: dark ? fluxColors.white : fluxColors.text,
      textMuted: dark ? '#98a2b3' : fluxColors.muted,
      primary: fluxColors.blue,
      accent: fluxColors.coral,
      border: dark ? '#344054' : '#eaecf0',
      tabInactive: dark ? '#98a2b3' : '#667085',
      banner: fluxColors.coral,
      navy: fluxColors.navy,
    },
  };
}

export type AppTheme = ReturnType<typeof getTheme>;
