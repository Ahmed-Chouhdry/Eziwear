export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
}

export interface AdminProductImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

export interface AdminProductVariant {
  id: number;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
  sku: string;
}

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface AdminProduct {
  id: number;
  categoryId: number;
  categoryName: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  salePrice: number | null;
  status: ProductStatus;
  isNewArrival: boolean;
  isFeatured: boolean;
  isVip: boolean;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  totalStock: number;
  createdAt: string;
}

export type AdminProductListItem = Omit<AdminProduct, 'images' | 'variants'> & {
  image: string | null;
  variantCount: number;
};

export interface AdminProductListQuery {
  search?: string;
  status?: ProductStatus;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ImageInput {
  imageUrl: string;
  sortOrder: number;
}

export interface VariantInput {
  size: string;
  color: string;
  colorHex?: string;
  stock: number;
  sku: string;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string;
  sku: string;
  categoryId: number;
  price: number;
  salePrice?: number | null;
  status: ProductStatus;
  isNewArrival: boolean;
  isFeatured: boolean;
  isVip: boolean;
  images: ImageInput[];
  variants: VariantInput[];
}

export type UpdateProductPayload = Partial<Omit<CreateProductPayload, 'images' | 'variants'>>;
