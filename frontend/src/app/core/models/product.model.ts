export type ProductBadge = 'new' | 'sale' | 'featured' | 'vip';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: number;
  size: string;
  color: string;
  colorHex?: string;
  stock: number;
  sku: string;
}

export interface Product {
  id: number;
  categoryId: number;
  categorySlug?: string;
  categoryName?: string;
  name: string;
  slug: string;
  description?: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  status: 'published' | 'draft' | 'archived';
  isNewArrival: boolean;
  isFeatured: boolean;
  isVip: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  rating?: number;
  reviewCount?: number;
}

export interface ProductQuery {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  page?: number;
  pageSize?: number;
}
