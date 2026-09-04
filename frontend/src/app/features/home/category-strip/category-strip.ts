import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../core/services/catalog.service';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-category-strip',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <div class="cs__head">
        <span class="eyebrow">Shop by category</span>
        <h2 class="cs__title">Find your fit</h2>
      </div>

      <div class="cs__grid">
        @for (c of categories() ?? []; track c.slug; let i = $index) {
          <a
            class="cs__card reveal"
            eziReveal
            [revealDelay]="i * 60"
            [routerLink]="['/shop', c.slug]"
          >
            <img class="cs__img" [src]="c.image" [alt]="c.name" loading="lazy" />
            <span class="cs__scrim"></span>
            <span class="cs__name">{{ c.name }}</span>
          </a>
        }
      </div>
    </section>
  `,
  styleUrl: './category-strip.scss',
})
export class CategoryStripComponent {
  private readonly catalog = inject(CatalogService);
  protected readonly categories = toSignal(this.catalog.getCategories(), { initialValue: null });
}
