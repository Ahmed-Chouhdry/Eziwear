import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { UiLoader } from './shared/components/ui-loader/ui-loader';
import { UiToast } from './shared/components/ui-toast/ui-toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiLoader, UiToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <ui-loader />
    <router-outlet />
    <ui-toast />
  `,
})
export class App {
  // Instantiate ThemeService early so data-theme + persistence are wired up.
  private readonly theme = inject(ThemeService);
}
