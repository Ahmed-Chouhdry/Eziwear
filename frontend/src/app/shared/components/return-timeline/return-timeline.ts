import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReturnHistoryEntry, RETURN_STATUS_LABEL, ReturnStatus } from '../../../core/services/return.service';

@Component({
  selector: 'return-timeline',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="rt" role="list">
      @for (h of history(); track h.id) {
        <li class="rt__step">
          <span class="rt__dot" aria-hidden="true"></span>
          <div class="rt__body">
            <span class="rt__status">{{ label(h.status) }}</span>
            @if (h.note) { <span class="rt__note">{{ h.note }}</span> }
            <span class="rt__time">{{ h.changed_at | date: 'medium' }}</span>
          </div>
        </li>
      }
    </ol>
  `,
  styles: [
    `
      .rt { display: flex; flex-direction: column; gap: 0; }
      .rt__step { position: relative; display: flex; gap: var(--sp-3); padding-bottom: var(--sp-4); }
      .rt__step:not(:last-child)::before {
        content: '';
        position: absolute;
        inset-inline-start: 5px;
        inset-block-start: 14px;
        bottom: 0;
        width: 2px;
        background: var(--border);
      }
      .rt__dot {
        flex: none;
        width: 12px;
        height: 12px;
        margin-top: 3px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 0 3px var(--ezi-orange-soft);
      }
      .rt__body { display: flex; flex-direction: column; gap: 2px; }
      .rt__status { font-family: var(--font-display); font-weight: 600; font-size: var(--fs-sm); text-transform: uppercase; letter-spacing: 0.03em; }
      .rt__note { font-size: var(--fs-sm); color: var(--text-muted); }
      .rt__time { font-size: var(--fs-xs); color: var(--text-faint); }
    `,
  ],
})
export class ReturnTimeline {
  readonly history = input<ReturnHistoryEntry[]>([]);
  protected label(s: string): string {
    return RETURN_STATUS_LABEL[s as ReturnStatus] ?? s;
  }
}
