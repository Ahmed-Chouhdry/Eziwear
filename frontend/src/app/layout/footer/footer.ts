import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CATEGORIES, SOCIAL_LINKS } from '../../core/nav';
import { ContentService } from '../../core/services/content.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly content = inject(ContentService);

  protected readonly categories = CATEGORIES;
  protected readonly year = new Date().getFullYear();

  private readonly abbr: Record<string, string> = {
    instagram: 'IG',
    tiktok: 'TT',
    facebook: 'FB',
    youtube: 'YT',
    whatsapp: 'WA',
    twitter: 'X',
    x: 'X',
  };

  private readonly liveSocial = toSignal(this.content.getSocialLinks(), { initialValue: null });
  protected readonly social = computed(() => {
    const rows = this.liveSocial();
    if (!rows || rows.length === 0) return SOCIAL_LINKS;
    return rows.map((s) => ({
      platform: s.platform,
      url: s.url,
      icon: this.abbr[s.platform.toLowerCase()] ?? s.platform.slice(0, 2).toUpperCase(),
    }));
  });

  protected readonly support = [
    { label: 'Contact Us', link: '/support/contact' },
    { label: 'Shipping & Delivery', link: '/support/shipping' },
    { label: 'Returns & Exchanges', link: '/support/returns' },
    { label: 'Size Guide', link: '/support/size-guide' },
    { label: 'FAQ', link: '/support/faq' },
  ];

  protected readonly policies = [
    { label: 'Privacy Policy', link: '/legal/privacy' },
    { label: 'Terms of Service', link: '/legal/terms' },
    { label: 'Return Policy', link: '/legal/returns' },
  ];
}
