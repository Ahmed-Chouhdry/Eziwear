import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <aside class="auth__brand">
        <a class="auth__logo" routerLink="/" aria-label="EZiWear home">
          <span class="auth__logo-a">EZi</span><span class="auth__logo-b">Wear</span>
        </a>
        <div class="auth__brand-foot">
          <h2 class="auth__brand-title">Move different.</h2>
          <p class="auth__copy">Premium streetwear built for movement.</p>
        </div>
      </aside>
      <main class="auth__panel">
        <div class="auth__card">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
