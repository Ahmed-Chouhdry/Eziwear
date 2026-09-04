import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
} from '@angular/core';

/**
 * Adds `.is-visible` when the element scrolls into view.
 * Pair with the global `.reveal` class for a fade-up.
 * Usage: <div class="reveal" eziReveal [revealDelay]="120"></div>
 */
@Directive({
  selector: '[eziReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  readonly revealDelay = input<number>(0);

  ngOnInit(): void {
    const node = this.el.nativeElement;

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const delay = this.revealDelay();
            if (delay) node.style.transitionDelay = `${delay}ms`;
            node.classList.add('is-visible');
            this.observer?.unobserve(node);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
