import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyType, WalletTransaction } from '../../../core/models/wallet.models';
import { CurrencyBadgeComponent } from '../../../shared/ui/currency-badge.component';
import { AdminApiService } from '../admin-api.service';

@Component({
  selector: 'app-wallet-adjustments',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyBadgeComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Wallet Credit &amp; Debit Operations</h1>
        <p class="subtitle">
          Execute atomic, double-entry ledger adjustments across any of the 5 reward currencies
        </p>
      </div>
    </div>

    <div class="ops-grid">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="vl-card form-card">
        <div class="mode-row">
          <label class="field-caption">Operation Type</label>
          <mat-button-toggle-group formControlName="operation" aria-label="Ledger Operation">
            <mat-button-toggle value="CREDIT">Credit (+ Add Funds)</mat-button-toggle>
            <mat-button-toggle value="DEBIT">Debit (- Deduct Funds)</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>Target User ID</mat-label>
            <input matInput type="number" formControlName="userId" min="1" />
            <mat-icon matPrefix>person</mat-icon>
            @if (form.controls.userId.hasError('required') || form.controls.userId.hasError('min')) {
              <mat-error>Valid User ID is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Currency Denomination</mat-label>
            <mat-select formControlName="currency">
              @for (curr of currencies; track curr) {
                <mat-option [value]="curr">{{ curr }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>Amount</mat-label>
            <input matInput type="number" formControlName="amount" min="0.01" step="0.01" />
            <mat-icon matPrefix>payments</mat-icon>
            @if (form.controls.amount.hasError('min')) {
              <mat-error>Amount must be greater than 0</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ledger Source Tag</mat-label>
            <input matInput formControlName="source" placeholder="e.g., ADMIN_BONUS or MANUAL_CORRECTION" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reference ID (Optional)</mat-label>
          <input matInput formControlName="referenceId" placeholder="e.g., TICKET-4092" />
          <mat-hint>Stored in wallet_transactions.reference_id for audit traceability</mat-hint>
        </mat-form-field>

        <button
          mat-flat-button
          [color]="form.controls.operation.value === 'CREDIT' ? 'primary' : 'warn'"
          type="submit"
          class="submit-btn"
          [disabled]="form.invalid || isSubmitting()"
        >
          @if (isSubmitting()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <span>
              Execute {{ form.controls.operation.value === 'CREDIT' ? 'Credit' : 'Debit' }} Entry
            </span>
          }
        </button>
      </form>

      <!-- Latest Recorded Ledger Entry Receipt -->
      <aside class="vl-card receipt-card">
        <h2>Last Recorded Ledger Entry</h2>
        @if (lastTransaction(); as tx) {
          <div class="receipt-body tabular-nums">
            <div class="receipt-top">
              <app-currency-badge [currency]="tx.currency"></app-currency-badge>
              <span class="tx-type">{{ tx.transactionType }}</span>
            </div>

            <div class="receipt-row">
              <span>Transaction ID</span>
              <code>{{ tx.transactionId }}</code>
            </div>
            <div class="receipt-row">
              <span>Source</span>
              <strong>{{ tx.source }}</strong>
            </div>
            <div class="receipt-row">
              <span>Balance Before</span>
              <span>{{ tx.balanceBefore | number : '1.2-2' }}</span>
            </div>
            <div class="receipt-row">
              <span>Balance After</span>
              <strong>{{ tx.balanceAfter | number : '1.2-2' }}</strong>
            </div>
          </div>
        } @else {
          <div class="empty-receipt">
            <mat-icon>receipt</mat-icon>
            <p>Submit a credit or debit operation to inspect the immutable double-entry snapshot.</p>
          </div>
        }
      </aside>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; font-size: 14px; color: var(--vl-text-secondary); }
    .ops-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .ops-grid { grid-template-columns: 1fr; }
    }
    .form-card, .receipt-card { padding: 24px; }
    .mode-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
    }
    .field-caption {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--vl-text-secondary);
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 600px) {
      .two-col { grid-template-columns: 1fr; }
    }
    .full-width { width: 100%; }
    .submit-btn { width: 100%; height: 44px; margin-top: 8px; font-weight: 600; }
    .receipt-card h2 { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
    .receipt-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vl-border);
    }
    .tx-type { font-size: 12px; font-weight: 700; color: var(--vl-text-secondary); }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
      border-bottom: 1px dashed var(--vl-border);
    }
    .receipt-row:last-child { border-bottom: none; }
    .empty-receipt {
      text-align: center;
      padding: 36px 12px;
      color: var(--vl-text-secondary);
      font-size: 13px;
    }
    .empty-receipt mat-icon { font-size: 32px; width: 32px; height: 32px; opacity: 0.5; }
  `],
})
export class WalletAdjustmentsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminApi = inject(AdminApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly currencies: CurrencyType[] = ['VES', 'SVES', 'GEMS', 'TOKENS', 'SPINS'];
  readonly isSubmitting = signal(false);
  readonly lastTransaction = signal<WalletTransaction | null>(null);

  readonly form = this.fb.nonNullable.group({
    operation: ['CREDIT' as 'CREDIT' | 'DEBIT', Validators.required],
    userId: [null as unknown as number, [Validators.required, Validators.min(1)]],
    currency: ['VES' as CurrencyType, Validators.required],
    amount: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
    source: ['ADMIN_ADJUSTMENT', [Validators.required, Validators.minLength(2)]],
    referenceId: [''],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      userId: Number(raw.userId),
      currency: raw.currency,
      amount: Number(raw.amount),
      source: raw.source.trim(),
      referenceId: raw.referenceId.trim() || undefined,
    };

    const request$ =
      raw.operation === 'CREDIT'
        ? this.adminApi.creditWallet(payload)
        : this.adminApi.debitWallet(payload);

    request$.subscribe({
      next: (tx) => {
        this.isSubmitting.set(false);
        this.lastTransaction.set(tx);
        this.snackBar.open(
          `${raw.operation} of ${payload.amount} ${payload.currency} recorded for User #${payload.userId}.`,
          'OK',
          { duration: 4000 }
        );
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }
}