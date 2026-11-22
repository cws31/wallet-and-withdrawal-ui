import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { IdempotencyService } from '../../../core/idempotency/idempotency.service';
import { PayoutMethod, PayoutOption } from '../../../core/models/withdrawal.models';
import { WalletStore } from '../../wallet/wallet.store';
import { WithdrawalStore } from '../withdrawal.store';

@Component({
  selector: 'app-create-withdrawal',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Request Payout</h1>
        <p class="subtitle">
          Redeem your VES balance via supported payout channels &bull; Protected by SHA-256 Idempotency
        </p>
      </div>
      <a mat-stroked-button routerLink="/withdrawals">
        <mat-icon>history</mat-icon>
        <span>Withdrawal History</span>
      </a>
    </div>

    @if (withdrawalStore.isLoadingConfig() || walletStore.isLoadingBalances()) {
      <mat-progress-bar mode="indeterminate" class="loader-bar"></mat-progress-bar>
    }

    <div class="checkout-grid">
      <!-- Left: Configuration Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-column vl-card">
        <!-- Step 1: Payout Method -->
        <div class="form-section">
          <label class="section-label">1. Select Payout Channel</label>
          <div class="method-grid">
            @for (method of withdrawalStore.payoutMethods(); track method.id) {
              <button
                type="button"
                class="select-tile"
                [class.selected]="selectedMethodId() === method.id"
                (click)="selectMethod(method)"
              >
                <mat-icon class="tile-icon">{{ getMethodIcon(method.code) }}</mat-icon>
                <span class="tile-title">{{ method.displayName }}</span>
                <span class="tile-sub">{{ method.code }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Step 2: Payout Tier Option -->
        <div class="form-section">
          <label class="section-label">2. Select Redemption Tier</label>
          @if (filteredOptions().length === 0 && !withdrawalStore.isLoadingConfig()) {
            <p class="muted-hint">No active payout tiers available for this channel.</p>
          } @else {
            <div class="tier-grid">
              @for (opt of filteredOptions(); track opt.id) {
                <button
                  type="button"
                  class="tier-tile tabular-nums"
                  [class.selected]="selectedOptionId() === opt.id"
                  [class.insufficient]="opt.vesRequired > walletStore.availableVes()"
                  (click)="selectOption(opt)"
                >
                  <div class="fiat-amount">
                    {{ opt.fiatCurrency || 'INR' }} {{ opt.fiatAmount | number : '1.0-0' }}
                  </div>
                  <div class="ves-cost">{{ opt.vesRequired | number : '1.2-2' }} VES</div>
                </button>
              }
            </div>
          }
        </div>

        <!-- Step 3: Destination Details -->
        <div class="form-section">
          <label class="section-label">3. Destination Details</label>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ destinationLabel() }}</mat-label>
            <input
              matInput
              formControlName="payoutDetails"
              [placeholder]="destinationPlaceholder()"
            />
            <mat-icon matPrefix>account_box</mat-icon>
            <mat-hint>Double-check carefully. Changing details generates a new idempotency fingerprint.</mat-hint>
            @if (form.controls.payoutDetails.hasError('required')) {
              <mat-error>Destination details are required</mat-error>
            } @else if (form.controls.payoutDetails.hasError('minlength')) {
              <mat-error>Enter a valid payout identifier</mat-error>
            }
          </mat-form-field>
        </div>

        @if (submissionError()) {
          <div class="alert-box error" role="alert">
            <mat-icon>gpp_bad</mat-icon>
            <div>
              <strong>Payout Request Declined</strong>
              <p>{{ submissionError() }}</p>
            </div>
          </div>
        }

        <div class="form-actions">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="submit-btn"
            [disabled]="!canSubmit()"
          >
            @if (withdrawalStore.isSubmitting()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <span>Confirm &amp; Submit Withdrawal</span>
            }
          </button>
        </div>
      </form>

      <!-- Right: Live Balance & Ledger Impact Summary -->
      <aside class="summary-column vl-card">
        <h2>Ledger Summary</h2>

        <div class="summary-row tabular-nums">
          <span>Available Balance</span>
          <strong>{{ walletStore.availableVes() | number : '1.2-2' }} VES</strong>
        </div>

        <div class="summary-row tabular-nums">
          <span>Selected Tier Cost</span>
          <span class="debit-text">
            -{{ selectedOption()?.vesRequired ?? 0 | number : '1.2-2' }} VES
          </span>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row total tabular-nums">
          <span>Estimated Remaining</span>
          <strong [class.negative-bal]="remainingVes() < 0">
            {{ remainingVes() | number : '1.2-2' }} VES
          </strong>
        </div>

        @if (remainingVes() < 0) {
          <div class="alert-box warning">
            <mat-icon>warning_amber</mat-icon>
            <span>Insufficient VES balance for the selected tier.</span>
          </div>
        }

        <div class="security-note">
          <mat-icon>verified_user</mat-icon>
          <div>
            <strong>Automated Fraud &amp; Ledger Protection</strong>
            <p>
              Approved requests debit VES immediately. Requests flagged for manual review remain
              in <code>PENDING</code> without deducting funds until verified by an administrator.
            </p>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; font-size: 14px; color: var(--vl-text-secondary); }
    .loader-bar { margin-bottom: 16px; }
    .checkout-grid {
      display: grid;
      grid-template-columns: 1.55fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .checkout-grid { grid-template-columns: 1fr; }
    }
    .form-column { padding: 24px; }
    .form-section { margin-bottom: 24px; }
    .section-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vl-text-secondary);
      margin-bottom: 12px;
    }
    .method-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .select-tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 14px;
      border-radius: 10px;
      border: 1.5px solid var(--vl-border);
      background: #fff;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .select-tile:hover { border-color: #93c5fd; }
    .select-tile.selected {
      border-color: #1d4ed8;
      background: #eff6ff;
    }
    .tile-icon { color: #1d4ed8; margin-bottom: 4px; }
    .tile-title { font-weight: 600; font-size: 14px; color: var(--vl-text-primary); }
    .tile-sub { font-size: 11px; color: var(--vl-text-secondary); }
    .tier-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }
    .tier-tile {
      padding: 12px;
      border-radius: 10px;
      border: 1.5px solid var(--vl-border);
      background: #fff;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
    }
    .tier-tile:hover { border-color: #93c5fd; }
    .tier-tile.selected {
      border-color: #1d4ed8;
      background: #eff6ff;
    }
    .tier-tile.insufficient { opacity: 0.65; }
    .fiat-amount { font-size: 16px; font-weight: 700; color: var(--vl-text-primary); }
    .ves-cost { font-size: 12px; color: var(--vl-text-secondary); margin-top: 2px; }
    .full-width { width: 100%; }
    .alert-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .alert-box p { margin: 2px 0 0; }
    .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .alert-box.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; margin-top: 14px; }
    .submit-btn { width: 100%; height: 46px; font-weight: 600; }
    .summary-column { padding: 24px; }
    .summary-column h2 { margin: 0 0 18px; font-size: 18px; font-weight: 600; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .debit-text { color: #b91c1c; font-weight: 600; }
    .summary-divider { height: 1px; background: var(--vl-border); margin: 16px 0; }
    .summary-row.total { font-size: 16px; }
    .negative-bal { color: #dc2626; }
    .security-note {
      margin-top: 20px;
      padding: 14px;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid var(--vl-border);
      display: flex;
      gap: 10px;
      font-size: 12px;
      color: var(--vl-text-secondary);
    }
    .security-note mat-icon { color: #059669; flex-shrink: 0; }
    .security-note p { margin: 4px 0 0; line-height: 1.45; }
    .muted-hint { font-size: 13px; color: var(--vl-text-secondary); }
  `],
})
export class CreateWithdrawalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly idempotency = inject(IdempotencyService);
  readonly walletStore = inject(WalletStore);
  readonly withdrawalStore = inject(WithdrawalStore);

  readonly selectedMethodId = signal<number | null>(null);
  readonly selectedOptionId = signal<number | null>(null);
  readonly submissionError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    payoutDetails: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(120)]],
  });

  readonly selectedMethod = computed(() =>
    this.withdrawalStore.payoutMethods().find((m) => m.id === this.selectedMethodId()) ?? null
  );

  readonly filteredOptions = computed(() => {
    const methodId = this.selectedMethodId();
    if (!methodId) return this.withdrawalStore.allOptions();
    const matching = this.withdrawalStore.allOptions().filter((o) => o.payoutMethodId === methodId);
    return matching.length > 0 ? matching : this.withdrawalStore.allOptions();
  });

  readonly selectedOption = computed(() =>
    this.filteredOptions().find((o) => o.id === this.selectedOptionId()) ?? null
  );

  readonly remainingVes = computed(() => {
    const current = this.walletStore.availableVes();
    const cost = this.selectedOption()?.vesRequired ?? 0;
    return current - cost;
  });

  readonly destinationLabel = computed(() => {
    const code = this.selectedMethod()?.code;
    if (code === 'UPI') return 'UPI Virtual Payment Address (VPA)';
    if (code?.includes('GIFT_CARD') || code === 'PAYPAL') return 'Recipient Email Address';
    return 'Payout Account / Identifier';
  });

  readonly destinationPlaceholder = computed(() => {
    const code = this.selectedMethod()?.code;
    if (code === 'UPI') return 'e.g. name@okaxis';
    if (code?.includes('GIFT_CARD') || code === 'PAYPAL') return 'e.g. recipient@example.com';
    return 'Enter destination account identifier';
  });

  readonly canSubmit = computed(() => {
    return (
      !this.withdrawalStore.isSubmitting() &&
      this.selectedMethodId() !== null &&
      this.selectedOptionId() !== null &&
      this.form.valid &&
      this.remainingVes() >= 0
    );
  });

  ngOnInit(): void {
    this.idempotency.clear();
    this.walletStore.refreshBalances();
    this.withdrawalStore.loadConfiguration();
  }

  selectMethod(method: PayoutMethod): void {
    this.selectedMethodId.set(method.id);
    this.selectedOptionId.set(null);
    this.submissionError.set(null);
  }

  selectOption(option: PayoutOption): void {
    this.selectedOptionId.set(option.id);
    this.submissionError.set(null);
  }

  getMethodIcon(code: string): string {
    switch (code) {
      case 'UPI':
        return 'qr_code_2';
      case 'AMAZON_GIFT_CARD':
        return 'card_giftcard';
      case 'GOOGLE_PLAY_GIFT_CARD':
        return 'shop';
      case 'PAYPAL':
        return 'account_balance';
      default:
        return 'payments';
    }
  }

  onSubmit(): void {
    const methodId = this.selectedMethodId();
    const optionId = this.selectedOptionId();
    if (!methodId || !optionId || !this.canSubmit()) return;

    this.submissionError.set(null);

    this.withdrawalStore
      .submitWithdrawal({
        payoutMethodId: methodId,
        payoutOptionId: optionId,
        payoutDetails: this.form.controls.payoutDetails.value.trim(),
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/withdrawals']);
        },
        error: (err) => {
          this.submissionError.set(
            err.error?.message ||
              'Withdrawal could not be processed. Check eligibility or fraud review limits.'
          );
        },
      });
  }
}