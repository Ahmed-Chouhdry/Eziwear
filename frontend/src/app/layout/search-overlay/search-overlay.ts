import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIES } from '../../core/nav';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-overlay.html',
  styleUrl: './search-overlay.scss',
})
export class SearchOverlay {
  protected readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected term = '';
  protected readonly categories = CATEGORIES;
  protected readonly suggestions = ['Tracksuit', 'Hoodie', 'Tee', 'Trouser', 'VIP'];

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    effect(() => {
      if (this.ui.searchOpen()) {
        queueMicrotask(() => this.input()?.nativeElement.focus());
      } else {
        this.term = '';
      }
    });
  }

  submit(): void {
    const q = this.term.trim();
    this.ui.toggleSearch(false);
    if (q) this.router.navigate(['/shop'], { queryParams: { search: q } });
  }

  pick(value: string): void {
    this.term = value;
    this.submit();
  }

  close(): void {
    this.ui.toggleSearch(false);
  }
}
