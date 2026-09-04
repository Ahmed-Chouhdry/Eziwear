import { toCategoryDto, type CategoryDto, type ProductDto } from './catalog.dto.js';
import { catalogRepository } from './catalog.repository.js';
import type { ProductQuery } from './catalog.schemas.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';

export const catalogService = {
  async categories(): Promise<CategoryDto[]> {
    const rows = await catalogRepository.listCategories();
    return rows.map(toCategoryDto);
  },

  async products(q: ProductQuery): Promise<Paginated<ProductDto>> {
    const { items, total } = await catalogRepository.listProducts(q);
    return paginate(items, total, q.page, q.pageSize);
  },

  section(section: string, limit: number): Promise<ProductDto[]> {
    return catalogRepository.section(section, limit);
  },

  async productBySlug(slug: string): Promise<ProductDto> {
    const product = await catalogRepository.getBySlug(slug);
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  },

  async related(slug: string, limit: number): Promise<ProductDto[]> {
    const product = await catalogRepository.getBySlug(slug);
    if (!product) throw ApiError.notFound('Product not found');
    return catalogRepository.related(product.id, product.categoryId, limit);
  },

  filterOptions(category?: string) {
    return catalogRepository.filterOptions(category);
  },
};
