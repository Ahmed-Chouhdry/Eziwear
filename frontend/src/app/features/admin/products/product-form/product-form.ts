import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { AdminCategory, AdminProductVariant, CreateProductPayload } from '../../../../core/models';
import { AdminProductService } from '../../../../core/services/admin-product.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UiImageUpload } from '../../../../shared/components/ui-image-upload/ui-image-upload';
import { UiSpinner } from '../../../../shared/components/ui-spinner/ui-spinner';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface ImageRow {
  imageUrl: string;
}
interface VariantRow {
  id: number | null;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  sku: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UiSpinner, UiImageUpload],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminProductService);
  private readonly toast = inject(ToastService);

  protected readonly productId = toSignal(
    this.route.paramMap.pipe(map((p) => (p.get('id') ? Number(p.get('id')) : null))),
    { initialValue: null },
  );
  protected readonly isEdit = computed(() => this.productId() != null);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly categories = signal<AdminCategory[]>([]);
  protected readonly images = signal<ImageRow[]>([]);
  protected readonly variants = signal<VariantRow[]>([]);
  private removedVariantIds: number[] = [];
  private originalVariants: AdminProductVariant[] = [];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: ['', [Validators.required]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    salePrice: [null as number | null],
    status: ['draft' as 'draft' | 'published' | 'archived'],
    isNewArrival: [false],
    isFeatured: [false],
    isVip: [false],
  });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    this.categories.set(await firstValueFrom(this.api.categories()));

    const id = this.productId();
    if (id != null) {
      const product = await firstValueFrom(this.api.get(id));
      this.form.patchValue({
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        description: product.description ?? '',
        price: product.price,
        salePrice: product.salePrice,
        status: product.status,
        isNewArrival: product.isNewArrival,
        isFeatured: product.isFeatured,
        isVip: product.isVip,
      });
      this.images.set(product.images.map((i) => ({ imageUrl: i.imageUrl })));
      this.originalVariants = product.variants;
      this.variants.set(
        product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex ?? '',
          stock: v.stock,
          sku: v.sku,
        })),
      );
    } else if (this.categories().length) {
      this.form.patchValue({ categoryId: this.categories()[0]!.id });
    }
    this.loading.set(false);
  }

  // ---- images ----
  addImage(): void {
    this.images.update((list) => [...list, { imageUrl: '' }]);
  }
  setImageUrl(i: number, value: string): void {
    this.images.update((list) => list.map((im, idx) => (idx === i ? { imageUrl: value } : im)));
  }
  removeImage(i: number): void {
    this.images.update((list) => list.filter((_, idx) => idx !== i));
  }
  moveImage(i: number, delta: number): void {
    this.images.update((list) => {
      const j = i + delta;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
  }

  // ---- variants ----
  addVariantRow(): void {
    this.variants.update((list) => [
      ...list,
      { id: null, size: '', color: '', colorHex: '', stock: 0, sku: '' },
    ]);
  }
  updateVariantField(i: number, field: keyof VariantRow, value: string | number): void {
    this.variants.update((list) =>
      list.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)),
    );
  }
  isValidHex(value: string): boolean {
    return HEX_COLOR_RE.test(value.trim());
  }
  removeVariantRow(i: number): void {
    const row = this.variants()[i];
    if (row?.id != null) this.removedVariantIds.push(row.id);
    this.variants.update((list) => list.filter((_, idx) => idx !== i));
  }

  // ---- save ----
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please fix the highlighted fields.');
      return;
    }
    if (this.variants().length === 0) {
      this.toast.error('Add at least one size/colour variant.');
      return;
    }
    for (const v of this.variants()) {
      if (!v.size.trim() || !v.color.trim() || !v.sku.trim()) {
        this.toast.error('Every variant needs a size, colour and SKU.');
        return;
      }
      if (v.colorHex.trim() && !HEX_COLOR_RE.test(v.colorHex.trim())) {
        this.toast.error(
          `"${v.color}" has an invalid hex colour — use the swatch picker, or a format like #0B0B0D.`,
        );
        return;
      }
    }

    this.saving.set(true);
    const v = this.form.getRawValue();
    const images = this.images()
      .filter((im) => im.imageUrl.trim())
      .map((im, i) => ({ imageUrl: im.imageUrl.trim(), sortOrder: i + 1 }));

    try {
      if (!this.isEdit()) {
        const payload: CreateProductPayload = {
          name: v.name,
          sku: v.sku,
          categoryId: v.categoryId,
          description: v.description || undefined,
          price: v.price,
          salePrice: v.salePrice,
          status: v.status,
          isNewArrival: v.isNewArrival,
          isFeatured: v.isFeatured,
          isVip: v.isVip,
          images,
          variants: this.variants().map((r) => ({
            size: r.size,
            color: r.color,
            colorHex: r.colorHex || undefined,
            stock: r.stock,
            sku: r.sku,
          })),
        };
        const created = await firstValueFrom(this.api.create(payload));
        this.toast.success('Product created.');
        void this.router.navigate(['/admin/products', created.id, 'edit']);
        return;
      }

      const id = this.productId()!;
      await firstValueFrom(
        this.api.update(id, {
          name: v.name,
          sku: v.sku,
          categoryId: v.categoryId,
          description: v.description || undefined,
          price: v.price,
          salePrice: v.salePrice,
          status: v.status,
          isNewArrival: v.isNewArrival,
          isFeatured: v.isFeatured,
          isVip: v.isVip,
        }),
      );
      await firstValueFrom(this.api.replaceImages(id, images));
      await this.syncVariants(id);

      this.toast.success('Product saved.');
      void this.router.navigate(['/admin/products']);
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.saving.set(false);
    }
  }

  private async syncVariants(productId: number): Promise<void> {
    for (const vid of this.removedVariantIds) {
      try {
        await firstValueFrom(this.api.deleteVariant(vid));
      } catch {
        /* variant may be protected (on past orders) — service already handled it */
      }
    }
    for (const row of this.variants()) {
      const payload = {
        size: row.size,
        color: row.color,
        colorHex: row.colorHex || undefined,
        stock: row.stock,
        sku: row.sku,
      };
      if (row.id == null) {
        await firstValueFrom(this.api.addVariant(productId, payload));
      } else {
        const original = this.originalVariants.find((o) => o.id === row.id);
        const changed =
          !original ||
          original.size !== row.size ||
          original.color !== row.color ||
          (original.colorHex ?? '') !== row.colorHex ||
          original.stock !== row.stock ||
          original.sku !== row.sku;
        if (changed) await firstValueFrom(this.api.updateVariant(row.id, payload));
      }
    }
  }
}
