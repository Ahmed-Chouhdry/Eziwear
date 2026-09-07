import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../directives/reveal.directive';

/** "Mid season drop" promo + the 4 trust icons — one dark band. Used on Home + Shop. */
@Component({
  selector: 'promo-trust',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pt section--tight">
      <div class="container pt__inner">
        <a class="pt__promo reveal" eziReveal [routerLink]="['/shop', 'sale']">
          <span class="pt__eyebrow">Mid season drop</span>
          <span class="pt__title">Up to 30% off</span>
          <span class="pt__sub">Selected EZiWear collection</span>
          <span class="btn btn--primary btn--sm">Shop the Sale</span>
        </a>
        <div class="pt__perks">
          @for (p of perks; track p.title) {
            <div class="pt__perk reveal" eziReveal>
              <span class="pt__icon" aria-hidden="true">
                @switch (p.icon) {
                  @case ('truck') {
                    <svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" /><circle cx="7.5" cy="18" r="1.7" /><circle cx="17.5" cy="18" r="1.7" /></svg>
                  }
                  @case ('gem') {
                    <svg viewBox="0 0 24 24"><path d="M6 3h12l3 5-9 13L3 8z" /><path d="M3 8h18M9 3 7 8l5 13 5-13-2-5" /></svg>
                  }
                  @case ('return') {
                    <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.7L21 9" /><path d="M21 4v5h-5" /><path d="M20 12a8 8 0 0 1-13.7 5.7L3 15" /><path d="M3 20v-5h5" /></svg>
                  }
                  @case ('lock') {
                    <svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                  }
                }
              </span>
              <span class="pt__text">
                <span class="pt__perk-title">{{ p.title }}</span>
                <span class="pt__note">{{ p.note }}</span>
              </span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './promo-trust.scss',
})
export class PromoTrust {
  protected readonly perks = [
    { icon: 'truck', title: 'Fast Delivery', note: 'Across Pakistan' },
    { icon: 'gem', title: 'Premium Quality', note: '100% Original' },
    { icon: 'return', title: 'Easy Returns', note: '7 Days Return' },
    { icon: 'lock', title: 'Secure Checkout', note: 'Safe & Secure' },
  ];
}
