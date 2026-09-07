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
  { platform: 'Instagram', url: 'https://www.instagram.com/eziwear05', icon: 'instagram' },
  { platform: 'TikTok', url: 'https://tiktok.com/@eziwear.official', icon: 'tiktok' },
  { platform: 'Facebook', url: 'https://facebook.com/eziwear.official', icon: 'facebook' },
  { platform: 'YouTube', url: 'https://youtube.com/@eziwear.official', icon: 'youtube' },
];

/** Display handle per platform, keyed by lowercase platform name. */
export const SOCIAL_HANDLES: Record<string, string> = {
  instagram: '@eziwear05',
  tiktok: '@eziwear.official',
  facebook: '/eziwear.official',
  youtube: '@eziwear.official',
  whatsapp: 'Chat with us',
};
