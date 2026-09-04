import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface FilterOptions {
  sizes: string[];
  colors: { name: string; hex: string | null }[];
  priceRange: { min: number; max: number };
}

export interface FilterState {
  sizes: string[];
  colors: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  sizes: [],
  colors: [],
  minPrice: null,
  maxPrice: null,
  inStock: false,
};

@Component({
  selector: 'shop-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop-filters.html',
  styleUrl: './shop-filters.scss',
})
export class ShopFilters {
  readonly options = input<FilterOptions | null>(null);
  readonly state = input.required<FilterState>();
  readonly loading = input(false);

  readonly filtersChange = output<FilterState>();
  readonly closeRequested = output<void>();

  protected readonly hasActive = computed(() => {
    const s = this.state();
    return (
      s.sizes.length > 0 ||
      s.colors.length > 0 ||
      s.minPrice != null ||
      s.maxPrice != null ||
      s.inStock
    );
  });

  toggleSize(size: string): void {
    const sizes = this.toggle(this.state().sizes, size);
    this.filtersChange.emit({ ...this.state(), sizes });
  }

  toggleColor(color: string): void {
    const colors = this.toggle(this.state().colors, color);
    this.filtersChange.emit({ ...this.state(), colors });
  }

  setInStock(checked: boolean): void {
    this.filtersChange.emit({ ...this.state(), inStock: checked });
  }

  setMinPrice(value: string): void {
    this.filtersChange.emit({ ...this.state(), minPrice: this.num(value) });
  }

  setMaxPrice(value: string): void {
    this.filtersChange.emit({ ...this.state(), maxPrice: this.num(value) });
  }

  clear(): void {
    this.filtersChange.emit({ ...EMPTY_FILTERS });
  }

  private toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  private num(value: string): number | null {
    const n = Number(value);
    return value.trim() === '' || Number.isNaN(n) ? null : n;
  }
}
