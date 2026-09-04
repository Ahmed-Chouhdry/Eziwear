import { Pipe, PipeTransform } from '@angular/core';

/** Formats a number as PKR currency, e.g. 4990 -> "Rs 4,990". */
@Pipe({ name: 'price', standalone: true })
export class PricePipe implements PipeTransform {
  private readonly fmt = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
  });

  transform(value: number | null | undefined, prefix = 'Rs'): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${prefix} ${this.fmt.format(Math.round(value))}`;
  }
}
