import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeKind =
  | 'new'
  | 'sale'
  | 'featured'
  | 'vip'
  | 'muted'
  | 'in-stock'
  | 'out-stock';

/** NEW / SALE = Burnt Orange · VIP = Soft Gold. Nothing else gets accent colors. */
@Component({
  selector: 'ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge badge--' + kind()"><ng-content /></span>`,
  styles: [`:host { display: inline-flex; }`],
})
export class UiBadge {
  readonly kind = input<BadgeKind>('new');
  protected readonly label = computed(() => this.kind());
}
