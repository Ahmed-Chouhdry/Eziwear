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

  private readonly knownIcons = new Set(['instagram', 'tiktok', 'facebook', 'youtube', 'whatsapp', 'twitter', 'x']);

  private readonly liveSocial = toSignal(this.content.getSocialLinks(), { initialValue: null });
  protected readonly social = computed(() => {
    const rows = this.liveSocial();
    const list = !rows || rows.length === 0 ? SOCIAL_LINKS : rows;
    return list.map((s) => {
      const key = s.platform.toLowerCase();
      return { platform: s.platform, url: s.url, icon: this.knownIcons.has(key) ? key : 'link' };
    });
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
