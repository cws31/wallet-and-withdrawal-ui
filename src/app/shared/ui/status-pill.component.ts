import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { WithdrawalStatus } from '../../core/models/withdrawal.models';

interface StatusStyle {
  label: string;
  icon: string;
  bg: string;
  fg: string;
}

const STATUS_MAP: Record<WithdrawalStatus, StatusStyle> = {
  PENDING: { label: 'Pending', icon: 'schedule', bg: '#fffbeb', fg: '#b45309' },
  PROCESSING: { label: 'Processing', icon: 'sync', bg: '#eff6ff', fg: '#1d4ed8' },
  APPROVED: { label: 'Approved', icon: 'check_circle', bg: '#ecfdf5', fg: '#047857' },
  REJECTED: { label: 'Rejected', icon: 'cancel', bg: '#fef2f2', fg: '#b91c1c' },
  CANCELLED: { label: 'Cancelled', icon: 'block', bg: '#f1f5f9', fg: '#475569' },
};

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <span
      class="status-pill"
      [style.background-color]="meta().bg"
      [style.color]="meta().fg"
    >
      <mat-icon class="status-icon">{{ meta().icon }}</mat-icon>
      <span>{{ meta().label }}</span>
    </span>
  `,
  styles: [`
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `],
})
export class StatusPillComponent {
  readonly status = input.required<WithdrawalStatus>();
  readonly meta = computed(() => STATUS_MAP[this.status()] ?? STATUS_MAP.PENDING);
}