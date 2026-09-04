import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { QuickAddService } from '../../core/services/quick-add.service';
import { Product } from '../../core/models';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ProductRail } from '../../shared/components/product-rail/product-rail';
import { HeroComponent } from './hero/hero';
import { CategoryStripComponent } from './category-strip/category-strip';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    RevealDirective,
    ProductRail,
    HeroComponent,
    CategoryStripComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly catalog = inject(CatalogService);
  private readonly quickAdd = inject(QuickAddService);

  protected readonly newArrivals = toSignal(this.catalog.getNewArrivals(4), { initialValue: null });
  protected readonly featured = toSignal(this.catalog.getFeatured(4), { initialValue: null });
  protected readonly vip = toSignal(this.catalog.getVip(4), { initialValue: null });
  protected readonly bestSellers = toSignal(this.catalog.getBestSellers(4), { initialValue: null });

  onAdd(product: Product): void {
    this.quickAdd.add(product);
  }
}
