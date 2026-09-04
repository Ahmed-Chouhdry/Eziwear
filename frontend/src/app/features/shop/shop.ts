import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { CATEGORIES } from '../../core/nav';
import { Product, ProductQuery } from '../../core/models';
import { CatalogService } from '../../core/services/catalog.service';
import { QuickAddService } from '../../core/services/quick-add.service';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { UiPagination } from '../../shared/components/ui-pagination/ui-pagination';
import { UiSkeleton } from '../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { EMPTY_FILTERS, FilterState, ShopFilters } from './shop-filters/shop-filters';

const SORTS: { value: NonNullable<ProductQuery['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

const SPECIAL_TITLES: Record<string, string> = {
  vip: 'VIP Collection',
  sale: 'Sale',
  'new-arrivals': 'New Arrivals',
  'best-sellers': 'Best Sellers',
};

const PAGE_SIZE = 9;

type SortValue = NonNullable<ProductQuery['sort']>;

interface RouteState {
  category: string;
  search: string;
  sizes: string[];
  colors: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  sort: SortValue;
  page: number;
}

const INITIAL_STATE: RouteState = {
  category: '',
  search: '',
  sizes: [],
  colors: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
  sort: 'newest',
  page: 1,
};

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ProductCard,
    UiEmptyState,
    UiPagination,
    UiSkeleton,
    ShopFilters,
    PricePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop.html',
  styleUrl: './shop.scss',
})
export class Shop {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly quickAdd = inject(QuickAddService);

  protected readonly sorts = SORTS;
  protected readonly categories = CATEGORIES;
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];
  protected readonly filtersOpen = signal(false);

  private readonly routeState = toSignal(
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      map(([params, query]): RouteState => {
        const sort = query.get('sort') as SortValue | null;
        return {
          category: params.get('category') ?? '',
          search: query.get('search') ?? '',
          sizes: splitCsv(query.get('sizes')),
          colors: splitCsv(query.get('colors')),
          minPrice: toNum(query.get('minPrice')),
          maxPrice: toNum(query.get('maxPrice')),
          inStock: query.get('inStock') === 'true',
          sort: sort ?? 'newest',
          page: Math.max(1, toNum(query.get('page')) ?? 1),
        };
      }),
    ),
    { initialValue: INITIAL_STATE },
  );

  protected readonly category = computed(() => this.routeState().category);
  protected readonly search = computed(() => this.routeState().search);
  protected readonly sort = computed(() => this.routeState().sort);
  protected readonly page = computed(() => this.routeState().page);

  protected readonly filterState = computed<FilterState>(() => {
    const s = this.routeState();
    return {
      sizes: s.sizes,
      colors: s.colors,
      minPrice: s.minPrice,
      maxPrice: s.maxPrice,
      inStock: s.inStock,
    };
  });

  private readonly query = computed<ProductQuery>(() => {
    const s = this.routeState();
    return {
      category: s.category || undefined,
      search: s.search || undefined,
      sizes: s.sizes.length ? s.sizes : undefined,
      colors: s.colors.length ? s.colors : undefined,
      minPrice: s.minPrice ?? undefined,
      maxPrice: s.maxPrice ?? undefined,
      inStock: s.inStock || undefined,
      sort: s.sort,
      page: s.page,
      pageSize: PAGE_SIZE,
    };
  });

  private readonly result = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.catalog.query(params),
  });

  private readonly filterOptionsRes = rxResource({
    params: () => this.category(),
    stream: ({ params }) => this.catalog.getFilterOptions(params || undefined),
  });

  protected readonly options = computed(() => this.filterOptionsRes.value() ?? null);
  protected readonly loading = computed(() => this.result.isLoading());
  protected readonly products = computed<Product[]>(() => this.result.value()?.items ?? []);
  protected readonly totalPages = computed(() => this.result.value()?.totalPages ?? 1);
  protected readonly total = computed(() => this.result.value()?.total ?? 0);

  protected readonly activeChips = computed(() => {
    const s = this.routeState();
    const chips: { key: string; label: string }[] = [];
    if (s.search) chips.push({ key: 'search', label: `“${s.search}”` });
    for (const size of s.sizes) chips.push({ key: `size:${size}`, label: `Size ${size}` });
    for (const color of s.colors) chips.push({ key: `color:${color}`, label: color });
    if (s.minPrice != null) chips.push({ key: 'minPrice', label: `Min Rs ${s.minPrice}` });
    if (s.maxPrice != null) chips.push({ key: 'maxPrice', label: `Max Rs ${s.maxPrice}` });
    if (s.inStock) chips.push({ key: 'inStock', label: 'In stock' });
    return chips;
  });

  protected readonly heading = computed(() => {
    const c = this.category();
    if (this.search()) return `Search: “${this.search()}”`;
    if (!c) return 'All Products';
    return SPECIAL_TITLES[c] ?? CATEGORIES.find((x) => x.slug === c)?.label ?? 'Shop';
  });
  protected readonly isVip = computed(() => this.category() === 'vip');

  // ---- navigation helpers ----

  setSort(value: string): void {
    this.patchQuery({ sort: value === 'newest' ? null : (value as SortValue), page: null });
  }

  goToPage(p: number): void {
    this.patchQuery({ page: p <= 1 ? null : p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  applyFilters(state: FilterState): void {
    this.patchQuery({
      sizes: state.sizes.length ? state.sizes.join(',') : null,
      colors: state.colors.length ? state.colors.join(',') : null,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      inStock: state.inStock ? 'true' : null,
      page: null,
    });
  }

  removeChip(key: string): void {
    if (key === 'search') return this.patchQuery({ search: null, page: null });
    if (key === 'inStock') return this.patchQuery({ inStock: null, page: null });
    if (key === 'minPrice') return this.patchQuery({ minPrice: null, page: null });
    if (key === 'maxPrice') return this.patchQuery({ maxPrice: null, page: null });
    if (key.startsWith('size:')) {
      const size = key.slice(5);
      const sizes = this.routeState().sizes.filter((s) => s !== size);
      return this.patchQuery({ sizes: sizes.length ? sizes.join(',') : null, page: null });
    }
    if (key.startsWith('color:')) {
      const color = key.slice(6);
      const colors = this.routeState().colors.filter((c) => c !== color);
      return this.patchQuery({ colors: colors.length ? colors.join(',') : null, page: null });
    }
  }

  clearAll(): void {
    this.applyFilters({ ...EMPTY_FILTERS });
  }

  onAdd(product: Product): void {
    this.quickAdd.add(product);
  }

  private patchQuery(patch: Params): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
    });
  }
}

function splitCsv(value: string | null): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

function toNum(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
