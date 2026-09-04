import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ContentService, Slider } from '../../../core/services/content.service';

interface Slide {
  eyebrow: string;
  vipTag: boolean;
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaLink: string;
  image: string;
}

const FALLBACK: Slide[] = [
  {
    eyebrow: 'New Collection',
    vipTag: false,
    headline: 'Move different.\nWear EZiWear.',
    sub: 'Premium streetwear built for movement — engineered fabrics, confident cuts.',
    ctaLabel: 'Shop Now',
    ctaLink: '/shop',
    image: 'https://picsum.photos/seed/ezi-hero-1/1600/1200',
  },
];

function eyebrowFor(link: string | null): { text: string; vip: boolean } {
  const l = (link ?? '').toLowerCase();
  if (l.includes('vip')) return { text: 'VIP Collection', vip: true };
  if (l.includes('sale')) return { text: 'Season Sale', vip: false };
  return { text: 'New Collection', vip: false };
}

function toSlide(s: Slider): Slide {
  const eb = eyebrowFor(s.buttonLink);
  return {
    eyebrow: eb.text,
    vipTag: eb.vip,
    headline: s.title ?? 'EZiWear',
    sub: s.subtitle ?? '',
    ctaLabel: s.buttonText ?? 'Shop Now',
    ctaLink: s.buttonLink ?? '/shop',
    image: s.imageUrl,
  };
}

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent implements OnInit {
  private readonly content = inject(ContentService);
  private readonly destroyRef = inject(DestroyRef);
  private timer?: ReturnType<typeof setInterval>;

  private readonly sliders = toSignal(this.content.getSliders(), { initialValue: null });

  protected readonly slides = computed<Slide[]>(() => {
    const rows = this.sliders();
    if (!rows || rows.length === 0) return FALLBACK;
    return rows.map(toSlide);
  });

  protected readonly active = signal(0);

  ngOnInit(): void {
    this.timer = setInterval(() => this.next(), 6000);
    this.destroyRef.onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  go(i: number): void {
    this.active.set(i);
  }

  next(): void {
    const count = this.slides().length;
    if (count > 0) this.active.update((i) => (i + 1) % count);
  }
}
