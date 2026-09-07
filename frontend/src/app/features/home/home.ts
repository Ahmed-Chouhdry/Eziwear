import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { QuickAddService } from '../../core/services/quick-add.service';
import { Product } from '../../core/models';
import { SOCIAL_HANDLES, SOCIAL_LINKS } from '../../core/nav';
import { ContentService } from '../../core/services/content.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ProductRail } from '../../shared/components/product-rail/product-rail';
import { PromoTrust } from '../../shared/components/promo-trust/promo-trust';
import { SocialIcon } from '../../shared/components/social-icon/social-icon';
import { HeroComponent } from './hero/hero';
import { CategoryStripComponent } from './category-strip/category-strip';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    RevealDirective,
    ProductCard,
    ProductRail,
    PromoTrust,
    SocialIcon,
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
  private readonly content = inject(ContentService);

  protected readonly newArrivals = toSignal(this.catalog.getNewArrivals(12), { initialValue: null });
  protected readonly featured = toSignal(this.catalog.getFeatured(12), { initialValue: null });
  protected readonly vip = toSignal(this.catalog.getVip(12), { initialValue: null });
  protected readonly bestSellers = toSignal(this.catalog.getBestSellers(12), { initialValue: null });

  private readonly knownIcons = new Set(['instagram', 'tiktok', 'facebook', 'youtube', 'whatsapp']);
  private readonly liveSocial = toSignal(this.content.getSocialLinks(), { initialValue: null });
  protected readonly social = computed(() => {
    const rows = this.liveSocial();
    const list = !rows || rows.length === 0 ? SOCIAL_LINKS : rows;
    return list.map((s) => {
      const key = s.platform.toLowerCase();
      return {
        platform: s.platform,
        url: s.url,
        icon: this.knownIcons.has(key) ? key : 'link',
        handle: SOCIAL_HANDLES[key] ?? '',
      };
    });
  });

  onAdd(product: Product): void {
    this.quickAdd.add(product);
  }
}
