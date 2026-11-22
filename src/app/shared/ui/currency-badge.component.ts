import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyType } from '../../core/models/wallet.models';

interface BadgeStyle {
  icon: string;
  bg: string;
  fg: string;
}

const CURRENCY_STYLES: Record<CurrencyType, BadgeStyle> = {
  VES: { icon: 'payments', bg: '#eff6ff', fg: '#1d4ed8' },
  SVES: { icon: 'lock_clock', bg: '#f5f3ff', fg: '#6d28d9' },
  GEMS: { icon: 'diamond', bg: '#ecfdf5', fg: '#047857' },
  TOKENS: { icon: 'toll', bg: '#fffbeb', fg: '#b45309' },
  SPINS: { icon: 'autorenew', bg: '#fdf2f8', fg: '#be185d' },
};

@Component({
  selector: 'app-currency-badge',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <span
      class="currency-pill"
      [style.background-color]="style().bg"
      [style.color]="style().fg"
    >
      <mat-icon class="pill-icon">{{ style().icon }}</mat-icon>
      <span>{{ currency() }}</span>
    </span>
  `,
  styles: [`
    .currency-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .pill-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `],
})
export class CurrencyBadgeComponent {
  readonly currency = input.required<CurrencyType>();
  readonly style = computed(() => CURRENCY_STYLES[this.currency()] ?? CURRENCY_STYLES.VES);
}