import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { PhasePlaceholder } from '../../shared/components/phase-placeholder/phase-placeholder';

const TITLES: Record<string, string> = {
  about: 'About EZiWear',
  contact: 'Contact Us',
  shipping: 'Shipping & Delivery',
  returns: 'Returns & Exchanges',
  'size-guide': 'Size Guide',
  faq: 'FAQ',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [PhasePlaceholder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<phase-placeholder
    phase="Content"
    [title]="title()"
    description="This page's content is added during the content pass before launch."
  />`,
})
export class StaticPage {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(
    this.route.url.pipe(map((segs) => segs.map((s) => s.path).pop() ?? 'about')),
    { initialValue: 'about' },
  );
  protected readonly title = computed(() => TITLES[this.slug()] ?? 'EZiWear');
}
