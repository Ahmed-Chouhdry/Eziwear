import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map, of } from 'rxjs';
import { Paginated, Product, ProductVariant } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { Review, ReviewEligibility, ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { UiService } from '../../core/services/ui.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { UiBadge } from '../../shared/components/ui-badge/ui-badge';
import { UiSkeleton } from '../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, ProductCard, UiBadge, UiSkeleton, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class ProductPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly ui = inject(UiService);
  private readonly doc = inject(DOCUMENT);
  private readonly fb = inject(FormBuilder);
  private readonly reviewApi = inject(ReviewService);
  protected readonly wishlist = inject(WishlistService);
  protected readonly auth = inject(AuthService);

  protected readonly slug = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')),
    { initialValue: '' },
  );

  private readonly res = rxResource({
    params: () => this.slug(),
    stream: ({ params }) => this.catalog.getBySlug(params),
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly product = computed<Product | undefined>(() => this.res.value());

  private readonly relatedRes = rxResource({
    params: () => this.product() ?? null,
    stream: ({ params }): ReturnType<CatalogService['getRelated']> =>
      params ? this.catalog.getRelated(params, 4) : of<Product[]>([]),
  });
  protected readonly related = computed<Product[]>(() => this.relatedRes.value() ?? []);

  protected readonly activeImage = signal(0);
  protected readonly selectedSize = signal<string | null>(null);
  protected readonly selectedColor = signal<string | null>(null);
  protected readonly quantity = signal(1);
  protected readonly zoomOpen = signal(false);
  protected readonly zoomStyle = signal<Record<string, string>>({});

  constructor() {
    // Reset + auto-select when the product changes
    effect(() => {
      const p = this.product();
      this.activeImage.set(0);
      this.quantity.set(1);
      this.zoomOpen.set(false);
      if (!p) {
        this.selectedSize.set(null);
        this.selectedColor.set(null);
        return;
      }
      const colors = this.colors();
      const sizes = this.sizes();
      this.selectedColor.set(
        colors.length === 1 ? colors[0].name : (colors.find((c) => this.colorHasStock(c.name))?.name ?? null),
      );
      this.selectedSize.set(sizes.length === 1 ? sizes[0] : null);
    });

    effect(() => {
      this.doc.body.classList.toggle('is-locked', this.zoomOpen());
    });
  }

  protected readonly sizes = computed(() => [
    ...new Set((this.product()?.variants ?? []).map((v) => v.size)),
  ]);

  protected readonly colors = computed(() => {
    const map = new Map<string, string | undefined>();
    for (const v of this.product()?.variants ?? []) {
      if (!map.has(v.color)) map.set(v.color, v.colorHex);
    }
    return [...map].map(([name, hex]) => ({ name, hex }));
  });

  protected readonly currentVariant = computed<ProductVariant | undefined>(() =>
    this.product()?.variants.find(
      (v) => v.size === this.selectedSize() && v.color === this.selectedColor(),
    ),
  );

  protected readonly onSale = computed(() => {
    const p = this.product();
    return !!p?.salePrice && p.salePrice < p.price;
  });

  protected readonly discountPct = computed(() => {
    const p = this.product();
    if (!p || !this.onSale()) return 0;
    return Math.round(((p.price - (p.salePrice as number)) / p.price) * 100);
  });

  protected readonly allSoldOut = computed(() =>
    (this.product()?.variants ?? []).every((v) => v.stock <= 0),
  );

  protected readonly canAdd = computed(() => (this.currentVariant()?.stock ?? 0) > 0);

  protected readonly stockNote = computed(() => {
    if (this.allSoldOut()) return { text: 'Sold out', level: 'out' as const };
    const v = this.currentVariant();
    if (this.selectedSize() && this.selectedColor() && (!v || v.stock <= 0)) {
      return { text: 'This combination is out of stock', level: 'out' as const };
    }
    if (v && v.stock > 0 && v.stock <= 5) return { text: `Only ${v.stock} left`, level: 'low' as const };
    if (v && v.stock > 0) return { text: 'In stock', level: 'ok' as const };
    return null;
  });

  private stockFor(size: string, color: string): number {
    return this.product()?.variants.find((v) => v.size === size && v.color === color)?.stock ?? 0;
  }

  private colorHasStock(color: string): boolean {
    return (this.product()?.variants ?? []).some((v) => v.color === color && v.stock > 0);
  }

  sizeAvailable(size: string): boolean {
    const color = this.selectedColor();
    if (color) return this.stockFor(size, color) > 0;
    return (this.product()?.variants ?? []).some((v) => v.size === size && v.stock > 0);
  }

  colorAvailable(color: string): boolean {
    const size = this.selectedSize();
    if (size) return this.stockFor(size, color) > 0;
    return this.colorHasStock(color);
  }

  selectImage(i: number): void {
    this.activeImage.set(i);
  }

  selectSize(size: string): void {
    if (!this.sizeAvailable(size)) return;
    this.selectedSize.set(size);
    this.clampQty();
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
    if (this.selectedSize() && !this.sizeAvailable(this.selectedSize()!)) {
      this.selectedSize.set(null);
    }
    this.clampQty();
  }

  setQty(delta: number): void {
    const max = this.currentVariant()?.stock ?? 10;
    this.quantity.update((q) => Math.max(1, Math.min(q + delta, Math.max(1, max))));
  }

  private clampQty(): void {
    const max = this.currentVariant()?.stock;
    if (max != null && this.quantity() > max) this.quantity.set(Math.max(1, max));
  }

  // ---- gallery zoom ----
  onZoomMove(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomStyle.set({ 'transform-origin': `${x}% ${y}%` });
  }

  openZoom(): void {
    this.zoomOpen.set(true);
  }
  closeZoom(): void {
    this.zoomOpen.set(false);
  }
  zoomStep(delta: number): void {
    const imgs = this.product()?.images.length ?? 1;
    this.activeImage.update((i) => (i + delta + imgs) % imgs);
  }

  toggleWishlist(): void {
    const p = this.product();
    if (p) this.wishlist.toggle(p);
  }

  async addToCart(buyNow = false): Promise<void> {
    const p = this.product();
    if (!p) return;
    if (this.allSoldOut()) {
      this.toast.error('This product is sold out.');
      return;
    }
    if (!this.selectedSize() || !this.selectedColor()) {
      this.toast.error('Please select a size and colour.');
      return;
    }
    const variant = this.currentVariant();
    if (!variant || variant.stock <= 0) {
      this.toast.error('That combination is out of stock.');
      return;
    }
    await this.cart.add(
      {
        productId: p.id,
        variantId: variant.id,
        name: p.name,
        slug: p.slug,
        image: p.images?.[0]?.imageUrl ?? null,
        size: variant.size,
        color: variant.color,
        unitPrice: p.salePrice ?? p.price,
        maxStock: variant.stock,
      },
      this.quantity(),
    );
    this.toast.success(`${p.name} added to cart.`);
    if (buyNow) void this.router.navigate(['/checkout']);
    else this.ui.toggleCartDrawer(true);
  }

  // ---- reviews ----
  private readonly EMPTY_REVIEWS: Paginated<Review> = { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 };

  private readonly reviewsRes = rxResource({
    params: () => this.slug() || null,
    stream: ({ params }) => (params ? this.reviewApi.list(params, 1, 10) : of(this.EMPTY_REVIEWS)),
  });
  protected readonly productReviews = computed(() => this.reviewsRes.value()?.items ?? []);

  private readonly mineRes = rxResource({
    params: () => (this.auth.isAuthenticated() && this.slug() ? this.slug() : null),
    stream: ({ params }) =>
      params ? this.reviewApi.mine(params) : of<ReviewEligibility | null>(null),
  });
  protected readonly myReview = computed(() => this.mineRes.value()?.review ?? null);
  protected readonly eligibleToReview = computed(() => this.mineRes.value()?.eligible ?? false);

  protected readonly reviewFormOpen = signal(false);
  protected readonly submittingReview = signal(false);
  protected readonly reviewForm = this.fb.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.maxLength(1000)]],
  });

  openReviewForm(): void {
    const existing = this.myReview();
    this.reviewForm.reset({ rating: existing?.rating ?? 5, comment: existing?.comment ?? '' });
    this.reviewFormOpen.set(true);
  }
  cancelReviewForm(): void {
    this.reviewFormOpen.set(false);
  }
  setReviewRating(n: number): void {
    this.reviewForm.controls.rating.setValue(n);
  }

  async submitReview(): Promise<void> {
    const slug = this.slug();
    if (!slug || this.reviewForm.invalid) return;
    const v = this.reviewForm.getRawValue();
    this.submittingReview.set(true);
    try {
      await firstValueFrom(this.reviewApi.submit(slug, v.rating, v.comment || undefined));
      this.toast.success('Thanks! Your review was submitted for moderation.');
      this.reviewFormOpen.set(false);
      this.mineRes.reload();
      this.reviewsRes.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.submittingReview.set(false);
    }
  }
}
