import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { CurrencyType } from '../../../core/models/wallet.models';
import { ReconciliationResult } from '../../../core/models/withdrawal.models';
import { AdminApiService } from '../admin-api.service';

@Component({
  selector: 'app-ledger-reconciliation',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Double-Entry Ledger Reconciliation</h1>
        <p class="subtitle">
          Verify wallet balances against cumulative completed ledger deltas
        </p>
      </div>
    </div>

    <div class="vl-card audit-panel">
      <form [formGroup]="form" (ngSubmit)="runAudit()" class="query-bar">
        <mat-form-field appearance="outline">
          <mat-label>Wallet ID</mat-label>
          <input matInput type="number" formControlName="walletId" min="1" placeholder="e.g., 1" />
          <mat-icon matPrefix>account_balance_wallet</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Currency</mat-label>
          <mat-select formControlName="currency">
            @for (c of currencies; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <button
          mat-flat-button
          color="primary"
          type="submit"
          class="audit-btn"
          [disabled]="form.invalid || isRunning()"
        >
          @if (isRunning()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>balance</mat-icon>
            <span>Verify Ledger Integrity</span>
          }
        </button>
      </form>

      @if (result(); as res) {
        <div class="result-box" [class.ok]="res.reconciled" [class.mismatch]="!res.reconciled">
          <div class="status-banner">
            <mat-icon>{{ res.reconciled ? 'verified' : 'gpp_bad' }}</mat-icon>
            <div>
              <strong>
                {{ res.reconciled ? 'RECONCILED — ZERO DISCREPANCY' : 'RECONCILIATION FAILURE — MISMATCH DETECTED' }}
              </strong>
              <p>
                Wallet #{{ res.walletId }} ({{ res.currency }}) verified against COMPLETED
                <code>wallet_transactions</code>.
              </p>
            </div>
          </div>

          <div class="metrics-row tabular-nums">
            <div class="metric-item">
              <span class="label">Current Wallet Balance</span>
              <span class="val">{{ res.currentBalance | number : '1.2-2' }} {{ res.currency }}</span>
            </div>

            <div class="metric-item">
              <span class="label">Sum of Ledger Deltas</span>
              <span class="val">{{ res.calculatedLedgerDelta | number : '1.2-2' }} {{ res.currency }}</span>
            </div>

            <div class="metric-item">
              <span class="label">Computed Discrepancy</span>
              <span class="val" [class.error-val]="!res.reconciled">
                {{ res.discrepancy | number : '1.2-2' }} {{ res.currency }}
              </span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; font-size: 14px; color: var(--vl-text-secondary); }
    .audit-panel { padding: 24px; max-width: 860px; }
    .query-bar {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .audit-btn {
      height: 56px;
      padding: 0 24px;
      font-weight: 600;
    }
    .result-box {
      margin-top: 24px;
      padding: 20px;
      border-radius: 12px;
      border: 1.5px solid var(--vl-border);
    }
    .result-box.ok {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .result-box.mismatch {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .status-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 20px;
    }
    .result-box.ok .status-banner mat-icon { color: #15803d; font-size: 28px; width: 28px; height: 28px; }
    .result-box.mismatch .status-banner mat-icon { color: #b91c1c; font-size: 28px; width: 28px; height: 28px; }
    .status-banner p { margin: 4px 0 0; font-size: 13px; color: var(--vl-text-secondary); }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
    }
    .metric-item { display: flex; flex-direction: column; gap: 4px; }
    .metric-item .label { font-size: 12px; color: var(--vl-text-secondary); }
    .metric-item .val { font-size: 20px; font-weight: 700; }
    .error-val { color: #dc2626; }
  `],
})
export class LedgerReconciliationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminApi = inject(AdminApiService);

  readonly currencies: CurrencyType[] = ['VES', 'SVES', 'GEMS', 'TOKENS', 'SPINS'];
  readonly isRunning = signal(false);
  readonly result = signal<ReconciliationResult | null>(null);

  readonly form = this.fb.nonNullable.group({
    walletId: [1, [Validators.required, Validators.min(1)]],
    currency: ['VES' as CurrencyType, Validators.required],
  });

  runAudit(): void {
    if (this.form.invalid || this.isRunning()) return;

    this.isRunning.set(true);
    const { walletId, currency } = this.form.getRawValue();

    this.adminApi.reconcileWallet(Number(walletId), currency).subscribe({
      next: (res) => {
        this.result.set(res);
        this.isRunning.set(false);
      },
      error: () => {
        this.isRunning.set(false);
      },
    });
  }
}