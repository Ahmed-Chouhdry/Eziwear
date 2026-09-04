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
        <a class="auth__logo" routerLink="/">EZi<span>Wear</span></a>
        <p class="auth__tagline">Move different. Wear EZiWear.</p>
        <p class="auth__copy">Premium streetwear built for movement.</p>
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
