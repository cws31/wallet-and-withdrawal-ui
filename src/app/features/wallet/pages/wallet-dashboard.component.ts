import { DatePipe, DecimalPipe , SlicePipe} from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LedgerFilterType, WalletTransaction } from '../../../core/models/wallet.models';
import { CurrencyBadgeComponent } from '../../../shared/ui/currency-badge.component';
import { WalletStore } from '../wallet.store';

@Component({
  selector: 'app-wallet-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    SlicePipe,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
    CurrencyBadgeComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Multi-Currency Wallet</h1>
        <p class="subtitle">
          Double-entry reward balances &amp; immutable transaction ledger
          @if (store.wallet(); as w) {
            <span class="meta-tag" matTooltip="JPA Optimistic Lock Version">
              Wallet #{{ w.id }} &bull; Ledger v{{ w.version }}
            </span>
          }
        </p>
      </div>

      <div class="header-actions">
        <button
          mat-stroked-button
          (click)="store.loadDashboard()"
          [disabled]="store.isLoadingBalances() || store.isLoadingLedger()"
        >
          <mat-icon>refresh</mat-icon>
          <span>Refresh</span>
        </button>

        <a mat-flat-button color="primary" routerLink="/withdrawals/new">
          <mat-icon>send_money</mat-icon>
          <span>Withdraw VES</span>
        </a>
      </div>
    </div>

    @if (store.isLoadingBalances()) {
      <mat-progress-bar mode="indeterminate" class="top-loader"></mat-progress-bar>
    }

    <!-- 5-Currency Balance Cards -->
    <section class="currency-grid" aria-label="Currency Balances">
      @for (card of store.currencyCards(); track card.code) {
        <div class="currency-card vl-card" [class.primary-ves]="card.redeemable">
          <div class="card-top">
            <div
              class="icon-box"
              [style.background-color]="card.bgTint"
              [style.color]="card.accentColor"
            >
              <mat-icon>{{ card.icon }}</mat-icon>
            </div>
            <span class="code-label">{{ card.code }}</span>
          </div>

          <div class="balance-value tabular-nums">
            {{ card.balance | number : (card.code === 'VES' || card.code === 'SVES' ? '1.2-2' : '1.0-0') }}
          </div>

          <div class="card-title">{{ card.label }}</div>
          <div class="card-desc">{{ card.description }}</div>

          @if (card.redeemable) {
            <div class="withdrawn-footer tabular-nums">
              <span>Lifetime Withdrawn:</span>
              <strong>{{ store.withdrawnVes() | number : '1.2-2' }} VES</strong>
            </div>
          }
        </div>
      }
    </section>

    <!-- Double-Entry Transaction Ledger -->
    <section class="ledger-section vl-card">
      <div class="ledger-toolbar">
        <div>
          <h2>Ledger History</h2>
          <p>Every balance mutation is recorded with exact pre- and post-transaction snapshots</p>
        </div>

        <mat-button-toggle-group
          [value]="store.filterType()"
          (change)="onFilterChange($event.value)"
          aria-label="Filter ledger transactions"
        >
          <mat-button-toggle value="ALL">All Entries</mat-button-toggle>
          <mat-button-toggle value="REWARDS">Rewards</mat-button-toggle>
          <mat-button-toggle value="WITHDRAWALS">Withdrawals</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (store.isLoadingLedger()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <div class="table-responsive">
        <table mat-table [dataSource]="store.transactions()" class="ledger-table">
          <!-- Timestamp & Tx ID -->
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Date &amp; Tx ID</th>
            <td mat-cell *matCellDef="let tx">
              <div class="tx-date">{{ tx.createdAt | date : 'medium' }}</div>
              <div class="tx-id" [matTooltip]="tx.transactionId">
                {{ tx.transactionId | slice : 0 : 12 }}...
              </div>
            </td>
          </ng-container>

          <!-- Currency -->
          <ng-container matColumnDef="currency">
            <th mat-header-cell *matHeaderCellDef>Currency</th>
            <td mat-cell *matCellDef="let tx">
              <app-currency-badge [currency]="tx.currency"></app-currency-badge>
            </td>
          </ng-container>

          <!-- Source & Type -->
          <ng-container matColumnDef="source">
            <th mat-header-cell *matHeaderCellDef>Source / Type</th>
            <td mat-cell *matCellDef="let tx">
              <div class="tx-source">{{ tx.source }}</div>
              <span class="tx-type-tag">{{ tx.transactionType }}</span>
            </td>
          </ng-container>

          <!-- Amount Delta -->
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="align-right">Delta</th>
            <td mat-cell *matCellDef="let tx" class="align-right tabular-nums">
              <span class="delta-badge" [class.positive]="isCredit(tx)" [class.negative]="!isCredit(tx)">
                {{ isCredit(tx) ? '+' : '-' }}{{ absAmount(tx.amount) | number : '1.2-2' }}
              </span>
            </td>
          </ng-container>

          <!-- Balance Snapshot (Before -> After) -->
          <ng-container matColumnDef="snapshot">
            <th mat-header-cell *matHeaderCellDef class="align-right">Balance Snapshot</th>
            <td mat-cell *matCellDef="let tx" class="align-right tabular-nums">
              <span class="bal-before">{{ tx.balanceBefore | number : '1.2-2' }}</span>
              <mat-icon class="arrow-icon">arrow_forward</mat-icon>
              <strong class="bal-after">{{ tx.balanceAfter | number : '1.2-2' }}</strong>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="empty-state" [attr.colspan]="displayedColumns.length">
              @if (!store.isLoadingLedger()) {
                <mat-icon>receipt_long</mat-icon>
                <p>No ledger entries found for filter "{{ store.filterType() }}".</p>
              }
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="store.totalTransactions()"
        [pageIndex]="store.pageIndex()"
        [pageSize]="store.pageSize()"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="handlePage($event)"
        showFirstLastButtons
      ></mat-paginator>
    </section>
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
    .page-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .subtitle {
      margin: 4px 0 0;
      color: var(--vl-text-secondary);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .meta-tag {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #e2e8f0;
      color: #334155;
      font-weight: 500;
    }
    .header-actions {
      display: flex;
      gap: 10px;
    }
    .top-loader {
      margin-bottom: 16px;
      border-radius: 4px;
    }
    .currency-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .currency-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease;
    }
    .currency-card.primary-ves {
      border-color: #93c5fd;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .icon-box {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: grid;
      place-items: center;
    }
    .code-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--vl-text-secondary);
      letter-spacing: 0.04em;
    }
    .balance-value {
      font-size: 26px;
      font-weight: 700;
      color: var(--vl-text-primary);
      line-height: 1.2;
    }
    .card-title {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 600;
    }
    .card-desc {
      font-size: 12px;
      color: var(--vl-text-secondary);
      margin-top: 2px;
    }
    .withdrawn-footer {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed var(--vl-border);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vl-text-secondary);
    }
    .ledger-section {
      overflow: hidden;
    }
    .ledger-toolbar {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--vl-border);
    }
    .ledger-toolbar h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .ledger-toolbar p {
      margin: 2px 0 0;
      font-size: 13px;
      color: var(--vl-text-secondary);
    }
    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }
    .ledger-table {
      width: 100%;
      min-width: 680px;
    }
    .tx-date {
      font-size: 13px;
      font-weight: 500;
    }
    .tx-id {
      font-size: 11px;
      font-family: monospace;
      color: var(--vl-text-secondary);
    }
    .tx-source {
      font-size: 13px;
      font-weight: 500;
    }
    .tx-type-tag {
      font-size: 11px;
      color: var(--vl-text-secondary);
    }
    .align-right {
      text-align: right;
    }
    .delta-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
    }
    .delta-badge.positive {
      background: #ecfdf5;
      color: #047857;
    }
    .delta-badge.negative {
      background: #fef2f2;
      color: #b91c1c;
    }
    .bal-before {
      color: var(--vl-text-secondary);
      font-size: 13px;
    }
    .arrow-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      vertical-align: middle;
      margin: 0 4px;
      color: #94a3b8;
    }
    .bal-after {
      font-size: 13px;
      color: var(--vl-text-primary);
    }
    .empty-state {
      text-align: center;
      padding: 48px 16px !important;
      color: var(--vl-text-secondary);
    }
    .empty-state mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      opacity: 0.5;
    }
  `],
})
export class WalletDashboardComponent implements OnInit {
  readonly store = inject(WalletStore);

  readonly displayedColumns = ['createdAt', 'currency', 'source', 'amount', 'snapshot'];

  ngOnInit(): void {
    this.store.loadDashboard();
  }

  onFilterChange(type: LedgerFilterType): void {
    this.store.setFilter(type);
  }

  handlePage(event: PageEvent): void {
    this.store.onPageChange(event.pageIndex, event.pageSize);
  }

  isCredit(tx: WalletTransaction): boolean {
    return tx.balanceAfter >= tx.balanceBefore;
  }

  absAmount(val: number): number {
    return Math.abs(val);
  }
}