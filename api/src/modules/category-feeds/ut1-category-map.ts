/** UT1 blacklist category → Flux Shield policy/UI category ids (PostgreSQL categories table). */

export const UT1_CATEGORY_MAP: Record<string, string> = {
  adult: 'adult',
  mixed_adult: 'adult',
  gambling: 'gambling',
  arjel: 'gambling',
  social_networks: 'social_media',
  'audio-video': 'streaming',
  webtv: 'streaming',
  webradio: 'streaming',
  radiotv: 'streaming',
  movies: 'streaming',
  games: 'gaming',
  publicite: 'advertising',
  marketingware: 'advertising',
  adv: 'advertising',
  drugs: 'drugs',
  drogue: 'drugs',
  weapons: 'weapons',
  violence: 'violence',
  aggressive: 'violence',
  agressif: 'violence',
  warez: 'piracy',
  vpn: 'vpn_proxy',
  anonvpn: 'vpn_proxy',
  strict_redirector: 'vpn_proxy',
  strong_redirector: 'vpn_proxy',
  reaffected: 'vpn_proxy',
  bitcoin: 'cryptocurrency',
  cryptojacking: 'cryptocurrency',
  dating: 'dating',
  forum: 'forums',
  press: 'news',
  news: 'news',
  shopping: 'shopping',
  malware: 'malware',
  phishing: 'phishing',
  ddos: 'malware',
  dialer: 'malware',
};

/**
 * Default UT1 source categories (modest Redis footprint — see PR memory table).
 * Override with optional env `CATEGORY_FEEDS_ENABLED` (comma-separated UT1 folder names).
 */
export const DEFAULT_UT1_SOURCE_CATEGORIES = [
  'mixed_adult',
  'gambling',
  'dating',
  'social_networks',
  'games',
  'audio-video',
  'ddos',
  'dialer',
  'drogue',
  'agressif',
];

export const UT1_TAR_URL =
  'https://dsi.ut-capitole.fr/blacklists/download/blacklists.tar.gz';

export const UT1_OLBAT_MIRROR_BASE =
  'https://raw.githubusercontent.com/olbat/ut1-blacklists/master/blacklists';

export function olbatDomainsUrl(ut1Category: string): string {
  return `${UT1_OLBAT_MIRROR_BASE}/${ut1Category}/domains`;
}

/** Rough average bytes per domain member in Redis SETs (overhead included). */
export const ESTIMATED_BYTES_PER_DOMAIN = 48;

export function estimateCategoryMemoryBytes(domainCount: number): number {
  return domainCount * ESTIMATED_BYTES_PER_DOMAIN;
}
