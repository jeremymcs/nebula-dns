/** UT1 blacklist category → Flux Shield policy/UI category ids (PostgreSQL categories table). */

export const UT1_CATEGORY_MAP: Record<string, string> = {
  adult: 'adult',
  mixed_adult: 'adult',
  porn: 'adult',
  sex: 'adult',
  lingerie: 'adult',
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
  weapons: 'weapons',
  violence: 'violence',
  aggressive: 'violence',
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

export const UT1_LOAD_CATEGORIES = [
  ...new Set(Object.keys(UT1_CATEGORY_MAP)),
];

export const UT1_BASE_URL =
  'https://dsi.ut-capitole.fr/blacklists/download';

export function ut1DomainsUrl(ut1Category: string): string {
  return `${UT1_BASE_URL}/${ut1Category}/domains`;
}
