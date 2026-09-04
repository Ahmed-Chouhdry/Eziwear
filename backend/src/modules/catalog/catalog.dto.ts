import type {
  CategoryRow,
  ProductImageRow,
  ProductRow,
  ProductVariantRow,
} from '../../database/types.js';

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  status: 'active' | 'inactive';
}

export interface ProductImageDto {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductVariantDto {
  id: number;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
  sku: string;
}

export interface ProductDto {
  id: number;
  categoryId: number;
  categorySlug: string | null;
  categoryName: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  salePrice: number | null;
  status: ProductRow['status'];
  isNewArrival: boolean;
  isFeatured: boolean;
  isVip: boolean;
  images: ProductImageDto[];
  variants: ProductVariantDto[];
  rating: number | null;
  reviewCount: number;
}

export function toCategoryDto(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    status: row.status,
  };
}

export function toImageDto(row: ProductImageRow): ProductImageDto {
  return { id: row.id, imageUrl: row.image_url, sortOrder: row.sort_order };
}

export function toVariantDto(row: ProductVariantRow): ProductVariantDto {
  return {
    id: row.id,
    size: row.size,
    color: row.color,
    colorHex: row.color_hex,
    stock: row.stock,
    sku: row.sku,
  };
}

export function toProductDto(
  row: ProductRow & { category_slug?: string | null; category_name?: string | null },
  images: ProductImageRow[],
  variants: ProductVariantRow[],
  review?: { rating: number | null; count: number },
): ProductDto {
  return {
    id: row.id,
    categoryId: row.category_id,
    categorySlug: row.category_slug ?? null,
    categoryName: row.category_name ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sku: row.sku,
    price: row.price,
    salePrice: row.sale_price,
    status: row.status,
    isNewArrival: !!row.is_new_arrival,
    isFeatured: !!row.is_featured,
    isVip: !!row.is_vip,
    images: images
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toImageDto),
    variants: variants.map(toVariantDto),
    rating: review?.rating ?? null,
    reviewCount: review?.count ?? 0,
  };
}
