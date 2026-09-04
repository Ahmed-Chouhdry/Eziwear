/** Static navigation config. Categories become dynamic (API) in Phase 14. */

export interface NavCategory {
  label: string;
  slug: string;
}

export const CATEGORIES: NavCategory[] = [
  { label: 'Tracksuits', slug: 'tracksuits' },
  { label: 'Hoodies', slug: 'hoodies' },
  { label: 'T-Shirts', slug: 't-shirts' },
  { label: 'Shirts', slug: 'shirts' },
  { label: 'Trousers', slug: 'trousers' },
];

export const COLLECTIONS: NavCategory[] = [
  { label: 'New Arrivals', slug: 'new-arrivals' },
  { label: 'Best Sellers', slug: 'best-sellers' },
  { label: 'Sale', slug: 'sale' },
];

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { platform: 'Instagram', url: 'https://instagram.com', icon: 'IG' },
  { platform: 'TikTok', url: 'https://tiktok.com', icon: 'TT' },
  { platform: 'Facebook', url: 'https://facebook.com', icon: 'FB' },
  { platform: 'YouTube', url: 'https://youtube.com', icon: 'YT' },
  { platform: 'WhatsApp', url: 'https://wa.me/0000000000', icon: 'WA' },
];
