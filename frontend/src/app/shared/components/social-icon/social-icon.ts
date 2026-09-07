import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Inline SVG glyph for a social platform. Simple geometric redraws — not brand
 * trademark path data. `name` is a lowercase platform key
 * (instagram / tiktok / facebook / youtube / whatsapp / x); anything else → a
 * generic link glyph.
 */
@Component({
  selector: 'social-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (name()) {
      @case ('instagram') {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('tiktok') {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46" />
          <path d="M14 4c.4 2.5 2.4 4 5 4" />
        </svg>
      }
      @case ('facebook') {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      }
      @case ('youtube') {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="2.5" y="6" width="19" height="12" rx="4" />
          <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('whatsapp') {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" />
          <path d="M8.6 9.4c0 3.4 2.5 6 5.9 6 .8 0 1-.6 1-1.1 0-.3-.1-.5-.4-.6l-1.6-.8c-.3-.1-.5-.1-.7.1l-.5.5a5 5 0 0 1-2-2l.5-.5c.2-.2.2-.4.1-.7l-.8-1.6c-.1-.3-.3-.4-.6-.4-.5 0-1.1.2-.9 1.1z" fill="currentColor" stroke="none" />
        </svg>
      }
      @case ('x') {
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M4 4l7 8.5L4.5 20H7l5-5.9L16 20h4l-7.4-8.9L19.5 4H17l-4.6 5.4L8 4z" />
        </svg>
      }
      @default {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M9 15l6-6M10 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M14 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
        </svg>
      }
    }
  `,
  styles: [
    `
      :host { display: inline-flex; }
      svg { width: 100%; height: 100%; }
    `,
  ],
})
export class SocialIcon {
  readonly name = input<string>('link');
}
