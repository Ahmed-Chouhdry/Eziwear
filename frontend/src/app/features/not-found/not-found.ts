import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nf">
      <span class="nf__code">404</span>
      <h1 class="nf__title">Page not found</h1>
      <p class="nf__sub">The page you're after has moved, sold out, or never existed.</p>
      <div class="nf__actions">
        <a class="btn btn--primary" routerLink="/">Back home</a>
        <a class="btn btn--secondary" routerLink="/shop">Go to shop</a>
      </div>
    </div>
  `,
  styles: [
    `
      .nf {
        min-height: 70vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: var(--sp-3);
        padding: var(--sp-6);
      }
      .nf__code {
        font-family: var(--font-display);
        font-weight: 700;
        font-size: clamp(4rem, 18vw, 9rem);
        line-height: 1;
        color: var(--accent);
      }
      .nf__title { font-size: var(--fs-2xl); text-transform: uppercase; }
      .nf__sub { color: var(--text-muted); max-width: 40ch; }
      .nf__actions { display: flex; gap: var(--sp-3); margin-top: var(--sp-4); flex-wrap: wrap; justify-content: center; }
    `,
  ],
})
export class NotFound {}
