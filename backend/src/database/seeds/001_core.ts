import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';

const img = (seed: string) => `https://picsum.photos/seed/${seed}/600/800`;

const CATEGORIES = [
  { name: 'Tracksuits', slug: 'tracksuits' },
  { name: 'Hoodies', slug: 'hoodies' },
  { name: 'T-Shirts', slug: 't-shirts' },
  { name: 'Shirts', slug: 'shirts' },
  { name: 'Trousers', slug: 'trousers' },
];

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORWAYS = [
  { name: 'Obsidian', hex: '#0B0B0D' },
  { name: 'Ivory', hex: '#F5F2EA' },
  { name: 'Graphite', hex: '#17171A' },
  { name: 'Burnt', hex: '#C96A32' },
];

interface ProductSeed {
  name: string;
  categorySlug: string;
  price: number;
  salePrice?: number;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  isVip?: boolean;
}

const PRODUCTS: ProductSeed[] = [
  { name: 'Velocity Zip Tracksuit', categorySlug: 'tracksuits', price: 8990, salePrice: 6990, isNewArrival: true },
  { name: 'Obsidian Tech Tracksuit', categorySlug: 'tracksuits', price: 10990, isVip: true, isFeatured: true },
  { name: 'Street Core Pullover Hoodie', categorySlug: 'hoodies', price: 5490, isNewArrival: true },
  { name: 'Ivory Heavyweight Hoodie', categorySlug: 'hoodies', price: 5990, isFeatured: true },
  { name: 'Champagne Oversized Hoodie', categorySlug: 'hoodies', price: 6490, salePrice: 4990 },
  { name: 'Essential Boxy Tee', categorySlug: 't-shirts', price: 2490, isNewArrival: true },
  { name: 'Burnt Graphic Tee', categorySlug: 't-shirts', price: 2790 },
  { name: 'Double Knit Polo', categorySlug: 't-shirts', price: 3490, isFeatured: true },
  { name: 'Structured Overshirt', categorySlug: 'shirts', price: 5990, isVip: true },
  { name: 'Minimal Linen Shirt', categorySlug: 'shirts', price: 4490, salePrice: 3490 },
  { name: 'Tapered Cargo Trouser', categorySlug: 'trousers', price: 5490, isNewArrival: true, isFeatured: true },
  { name: 'Relaxed Pleated Trouser', categorySlug: 'trousers', price: 4990 },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'order_status_history', 'order_items', 'orders',
    'cart_items', 'carts', 'wishlists', 'reviews', 'notifications', 'audit_logs',
    'product_variants', 'product_images', 'products', 'categories',
    'coupons', 'sliders', 'advertisements', 'social_links',
    'password_resets', 'addresses', 'users',
  ]) {
    await knex(table).truncate();
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // ---- Users ----
  const [adminHash, customerHash] = await Promise.all([
    bcrypt.hash('Admin@12345', 12),
    bcrypt.hash('Customer@123', 12),
  ]);
  await knex('users').insert([
    { id: 1, name: 'EZiWear Admin', email: 'admin@eziwear.com', phone: '03000000000', password_hash: adminHash, role: 'admin', status: 'active' },
    { id: 2, name: 'Sample Customer', email: 'customer@eziwear.com', phone: '03001112222', password_hash: customerHash, role: 'customer', status: 'active' },
  ]);
  await knex('addresses').insert({
    user_id: 2, name: 'Sample Customer', phone: '03001112222',
    address: 'House 12, Street 4, Gulberg III', city: 'Lahore', area: 'Gulberg', postal_code: '54000', is_default: true,
  });

  // ---- Categories ----
  const categoryRows = CATEGORIES.map((c, i) => ({
    id: i + 1, name: c.name, slug: c.slug, sort_order: i,
    description: `${c.name} — premium streetwear cut for movement.`,
    image: img(`ezi-cat-${c.slug}`), status: 'active' as const,
  }));
  await knex('categories').insert(categoryRows);
  const catIdBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  // ---- Products + images + variants ----
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i]!;
    const id = i + 1;
    const slug = slugify(p.name);
    await knex('products').insert({
      id,
      category_id: catIdBySlug.get(p.categorySlug)!,
      name: p.name,
      slug,
      description:
        'Cut for movement in a premium heavyweight fabric with a clean, confident silhouette. ' +
        'Designed and finished to EZiWear standards.',
      sku: `EZI-${id}`,
      price: p.price,
      sale_price: p.salePrice ?? null,
      status: 'published',
      is_new_arrival: !!p.isNewArrival,
      is_featured: !!p.isFeatured,
      is_vip: !!p.isVip,
    });

    await knex('product_images').insert([
      { product_id: id, image_url: img(`ezi-${slug}-1`), sort_order: 1 },
      { product_id: id, image_url: img(`ezi-${slug}-2`), sort_order: 2 },
    ]);

    const colors = COLORWAYS.slice(0, 2 + (i % 3));
    let variantSeq = 0;
    const variants = colors.flatMap((c) =>
      SIZES.map((size) => ({
        product_id: id,
        size,
        color: c.name,
        color_hex: c.hex,
        stock: (i + variantSeq++) % 7 === 0 ? 0 : 5 + ((i * 3 + variantSeq) % 18),
        sku: `EZI-${id}-${c.name.slice(0, 2).toUpperCase()}-${size}`,
      })),
    );
    await knex('product_variants').insert(variants);
  }

  // ---- Coupon ----
  await knex('coupons').insert({
    code: 'WELCOME10', type: 'percentage', value: 10, min_order: 3000, max_discount: 1500,
    usage_limit: 1000, status: 'active',
  });

  // ---- Sliders (title carries a newline for the hero display) ----
  await knex('sliders').insert([
    { title: 'Move different.\nWear EZiWear.', subtitle: 'Premium streetwear built for movement — engineered fabrics, confident cuts.', image_url: 'https://picsum.photos/seed/ezi-hero-1/1600/1200', button_text: 'Shop Now', button_link: '/shop', sort_order: 1, status: 'active' },
    { title: 'Limited.\nEarned.', subtitle: 'A tighter run of heavyweight pieces, finished to a higher standard.', image_url: 'https://picsum.photos/seed/ezi-hero-2/1600/1200', button_text: 'Explore VIP', button_link: '/shop/vip', sort_order: 2, status: 'active' },
    { title: 'Up to 30% off\nselect styles.', subtitle: 'Core tracksuits, hoodies and trousers — while stock lasts.', image_url: 'https://picsum.photos/seed/ezi-hero-3/1600/1200', button_text: 'Shop the Sale', button_link: '/shop/sale', sort_order: 3, status: 'active' },
  ]);

  // ---- Social links ----
  await knex('social_links').insert([
    { platform: 'Instagram', url: 'https://instagram.com/eziwear', sort_order: 1, status: 'active' },
    { platform: 'TikTok', url: 'https://tiktok.com/@eziwear', sort_order: 2, status: 'active' },
    { platform: 'Facebook', url: 'https://facebook.com/eziwear', sort_order: 3, status: 'active' },
    { platform: 'YouTube', url: 'https://youtube.com/@eziwear', sort_order: 4, status: 'active' },
    { platform: 'WhatsApp', url: 'https://wa.me/920000000000', sort_order: 5, status: 'active' },
  ]);
}
