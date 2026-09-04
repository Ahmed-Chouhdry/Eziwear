import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, COLLECTIONS } from '../../core/nav';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
})
export class MobileMenu {
  protected readonly ui = inject(UiService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);

  protected readonly categories = CATEGORIES;
  protected readonly collections = COLLECTIONS;

  close(): void {
    this.ui.toggleMobileMenu(false);
  }
}
