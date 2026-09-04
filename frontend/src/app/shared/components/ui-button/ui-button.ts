import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'vip' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * EZiWear button. Renders <a> when `href` or `routerLink` is set, otherwise <button>.
 * Primary = Burnt Orange + Ivory. Keep primary rare so real actions stand out.
 */
@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (routerLink() != null) {
      <a
        [routerLink]="routerLink()"
        [class]="classes()"
        [attr.aria-disabled]="disabled() || null"
        [attr.tabindex]="disabled() ? -1 : null"
      >
        @if (loading()) { <span class="ui-btn__spinner" aria-hidden="true"></span> }
        <ng-content />
      </a>
    } @else if (href()) {
      <a
        [href]="href()"
        [class]="classes()"
        [attr.target]="external() ? '_blank' : null"
        [attr.rel]="external() ? 'noopener noreferrer' : null"
      >
        @if (loading()) { <span class="ui-btn__spinner" aria-hidden="true"></span> }
        <ng-content />
      </a>
    } @else {
      <button [type]="type()" [class]="classes()" [disabled]="disabled() || loading()">
        @if (loading()) { <span class="ui-btn__spinner" aria-hidden="true"></span> }
        <ng-content />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      :host([block]) {
        display: flex;
      }
      :host([block]) > * {
        width: 100%;
      }
      .ui-btn__spinner {
        width: 15px;
        height: 15px;
        border-radius: 50%;
        border: 2px solid currentColor;
        border-top-color: transparent;
        animation: ezi-spin 0.7s linear infinite;
      }
    `,
  ],
})
export class UiButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly block = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly href = input<string | null>(null);
  readonly external = input(false);
  readonly routerLink = input<string | unknown[] | null>(null);

  protected readonly classes = computed(() => {
    const c = ['btn', `btn--${this.variant()}`];
    if (this.size() !== 'md') c.push(`btn--${this.size()}`);
    if (this.block()) c.push('btn--block');
    return c.join(' ');
  });
}
