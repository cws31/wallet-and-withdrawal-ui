import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { WithdrawalStatus } from '../../../core/models/withdrawal.models';
import { StatusPillComponent } from '../../../shared/ui/status-pill.component';
import { WithdrawalStore } from '../withdrawal.store';

@Component({
  selector: 'app-withdrawal-list',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
    StatusPillComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Withdrawal History</h1>
        <p class="subtitle">Track payout queue status, fraud review notes, and balance reversals</p>
      </div>

      <div class="header-actions">
        <button mat-stroked-button (click)="store.loadWithdrawals()" [disabled]="store.isLoadingList()">
          <mat-icon>refresh</mat-icon>
          <span>Refresh</span>
        </button>
        <a mat-flat-button color="primary" routerLink="/withdrawals/new">
          <mat-icon>add</mat-icon>
          <span>New Payout</span>
        </a>
      </div>
    </div>

    <section class="vl-card table-card">
      <div class="toolbar">
        <mat-button-toggle-group
          [value]="store.statusFilter()"
          (change)="onStatusChange($event.value)"
          aria-label="Filter withdrawals by status"
        >
          <mat-button-toggle value="ALL">All</mat-button-toggle>
          <mat-button-toggle value="PENDING">Pending</mat-button-toggle>
          <mat-button-toggle value="PROCESSING">Processing</mat-button-toggle>
          <mat-button-toggle value="APPROVED">Approved</mat-button-toggle>
          <mat-button-toggle value="REJECTED">Rejected</mat-button-toggle>
          <mat-button-toggle value="CANCELLED">Cancelled</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (store.isLoadingList()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <div class="table-responsive">
        <table mat-table [dataSource]="store.withdrawals()" class="withdrawal-table">
          <!-- Withdrawal ID & Date -->
          <ng-container matColumnDef="withdrawalId">
            <th mat-header-cell *matHeaderCellDef>Reference &amp; Date</th>
            <td mat-cell *matCellDef="let w">
              <div class="ref-id">{{ w.withdrawalId }}</div>
              <div class="sub-text">{{ w.createdAt | date : 'medium' }}</div>
            </td>
          </ng-container>

          <!-- Destination -->
          <ng-container matColumnDef="destination">
            <th mat-header-cell *matHeaderCellDef>Channel &amp; Destination</th>
            <td mat-cell *matCellDef="let w">
              <div class="dest-value">{{ w.payoutDetails }}</div>
              <div class="sub-text">{{ w.payoutMethodName || w.payoutMethodCode || ('Method #' + w.payoutMethodId) }}</div>
            </td>
          </ng-container>

          <!-- Amount -->
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="align-right">VES Debited</th>
            <td mat-cell *matCellDef="let w" class="align-right tabular-nums">
              <strong>{{ w.vesAmount | number : '1.2-2' }} VES</strong>
              @if (w.fiatAmount) {
                <div class="sub-text">{{ w.fiatCurrency || 'INR' }} {{ w.fiatAmount | number : '1.0-0' }}</div>
              }
            </td>
          </ng-container>

          <!-- Status & Audit Notes -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let w">
              <app-status-pill [status]="w.status"></app-status-pill>
              @if (w.reviewNote) {
                <div class="note-tag review" [matTooltip]="w.reviewNote">
                  Under Security Review
                </div>
              }
              @if (w.rejectionReason) {
                <div class="note-tag rejected" [matTooltip]="w.rejectionReason">
                  Reason: {{ w.rejectionReason }}
                </div>
              }
            </td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="align-right">Action</th>
            <td mat-cell *matCellDef="let w" class="align-right">
              @if (w.status === 'PENDING') {
                <button
                  mat-stroked-button
                  color="warn"
                  [disabled]="store.cancellingId() === w.id"
                  (click)="store.cancelWithdrawal(w.id)"
                >
                  Cancel
                </button>
              } @else {
                <span class="sub-text">—</span>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="empty-state" [attr.colspan]="displayedColumns.length">
              @if (!store.isLoadingList()) {
                <mat-icon>payments</mat-icon>
                <p>No withdrawal records found.</p>
              }
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="store.totalWithdrawals()"
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
    .page-header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .subtitle { margin: 4px 0 0; font-size: 14px; color: var(--vl-text-secondary); }
    .header-actions { display: flex; gap: 10px; }
    .table-card { overflow: hidden; }
    .toolbar {
      padding: 16px 20px;
      border-bottom: 1px solid var(--vl-border);
      overflow-x: auto;
    }
    .table-responsive { width: 100%; overflow-x: auto; }
    .withdrawal-table { width: 100%; min-width: 720px; }
    .ref-id { font-family: monospace; font-size: 13px; font-weight: 600; }
    .dest-value { font-size: 13px; font-weight: 500; }
    .sub-text { font-size: 12px; color: var(--vl-text-secondary); }
    .align-right { text-align: right; }
    .note-tag {
      margin-top: 4px;
      font-size: 11px;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .note-tag.review { color: #b45309; }
    .note-tag.rejected { color: #b91c1c; }
    .empty-state {
      text-align: center;
      padding: 48px 16px !important;
      color: var(--vl-text-secondary);
    }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; opacity: 0.5; }
  `],
})
export class WithdrawalListComponent implements OnInit {
  readonly store = inject(WithdrawalStore);

  readonly displayedColumns = ['withdrawalId', 'destination', 'amount', 'status', 'actions'];

  ngOnInit(): void {
    this.store.loadWithdrawals();
  }

  onStatusChange(status: WithdrawalStatus | 'ALL'): void {
    this.store.setStatusFilter(status);
  }

  handlePage(event: PageEvent): void {
    this.store.onPageChange(event.pageIndex, event.pageSize);
  }
}