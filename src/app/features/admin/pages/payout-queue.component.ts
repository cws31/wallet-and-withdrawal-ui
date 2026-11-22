import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Withdrawal, WithdrawalStatus } from '../../../core/models/withdrawal.models';
import { StatusPillComponent } from '../../../shared/ui/status-pill.component';
import { AdminApiService } from '../admin-api.service';
import { RejectWithdrawalDialogComponent } from '../reject-withdrawal-dialog.component';

@Component({
  selector: 'app-payout-queue',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
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
        <h1>Payout Operations Queue</h1>
        <p class="subtitle">
          Review flagged withdrawals, transition processing states, and execute payout approvals
        </p>
      </div>

      <button mat-stroked-button (click)="loadQueue()" [disabled]="isLoading()">
        <mat-icon>refresh</mat-icon>
        <span>Refresh Queue</span>
      </button>
    </div>

    <section class="vl-card table-card">
      <div class="toolbar">
        <mat-button-toggle-group
          [value]="statusFilter()"
          (change)="onStatusChange($event.value)"
          aria-label="Filter admin payouts"
        >
          <mat-button-toggle value="ALL">All</mat-button-toggle>
          <mat-button-toggle value="PENDING">Pending Review</mat-button-toggle>
          <mat-button-toggle value="PROCESSING">Processing</mat-button-toggle>
          <mat-button-toggle value="APPROVED">Approved</mat-button-toggle>
          <mat-button-toggle value="REJECTED">Rejected</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <div class="table-responsive">
        <table mat-table [dataSource]="items()" class="admin-table">
          <!-- Reference & Timestamp -->
          <ng-container matColumnDef="reference">
            <th mat-header-cell *matHeaderCellDef>Withdrawal ID</th>
            <td mat-cell *matCellDef="let w">
              <div class="mono-id">{{ w.withdrawalId }}</div>
              <div class="sub-text">{{ w.createdAt | date : 'short' }}</div>
            </td>
          </ng-container>

          <!-- User -->
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let w">
              <div class="primary-text">User #{{ w.userId }}</div>
              @if (w.userEmail) {
                <div class="sub-text">{{ w.userEmail }}</div>
              }
            </td>
          </ng-container>

          <!-- Destination -->
          <ng-container matColumnDef="destination">
            <th mat-header-cell *matHeaderCellDef>Payout Destination</th>
            <td mat-cell *matCellDef="let w">
              <div class="primary-text">{{ w.payoutDetails }}</div>
              <div class="sub-text">
                {{ w.payoutMethodName || w.payoutMethodCode || ('Method #' + w.payoutMethodId) }}
              </div>
            </td>
          </ng-container>

          <!-- Amount -->
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="align-right">Amount</th>
            <td mat-cell *matCellDef="let w" class="align-right tabular-nums">
              <strong>{{ w.vesAmount | number : '1.2-2' }} VES</strong>
              @if (w.fiatAmount) {
                <div class="sub-text">
                  {{ w.fiatCurrency || 'INR' }} {{ w.fiatAmount | number : '1.0-0' }}
                </div>
              }
            </td>
          </ng-container>

          <!-- Status & Fraud Review -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status &amp; Risk Notes</th>
            <td mat-cell *matCellDef="let w">
              <app-status-pill [status]="w.status"></app-status-pill>
              @if (w.reviewNote) {
                <div class="risk-callout" [matTooltip]="w.reviewNote">
                  <mat-icon>gpp_maybe</mat-icon>
                  <span>{{ w.reviewNote }}</span>
                </div>
              }
              @if (w.rejectionReason) {
                <div class="reject-callout">{{ w.rejectionReason }}</div>
              }
            </td>
          </ng-container>

          <!-- Admin State Transitions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="align-right">Operations</th>
            <td mat-cell *matCellDef="let w" class="align-right">
              <div class="action-group">
                @if (w.status === 'PENDING') {
                  <button
                    mat-stroked-button
                    [disabled]="mutatingId() === w.id"
                    (click)="transitionToProcessing(w)"
                  >
                    Process
                  </button>
                }

                @if (w.status === 'PENDING' || w.status === 'PROCESSING') {
                  <button
                    mat-flat-button
                    color="primary"
                    [disabled]="mutatingId() === w.id"
                    (click)="approve(w)"
                  >
                    Approve
                  </button>

                  <button
                    mat-stroked-button
                    color="warn"
                    [disabled]="mutatingId() === w.id"
                    (click)="openRejectDialog(w)"
                  >
                    Reject
                  </button>
                } @else {
                  <span class="sub-text">Finalized</span>
                }
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="empty-state" [attr.colspan]="displayedColumns.length">
              @if (!isLoading()) {
                <mat-icon>fact_check</mat-icon>
                <p>No withdrawals match the selected queue filter.</p>
              }
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="totalElements()"
        [pageIndex]="pageIndex()"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[15, 30, 50]"
        (page)="onPage($event)"
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
    .table-card { overflow: hidden; }
    .toolbar { padding: 16px 20px; border-bottom: 1px solid var(--vl-border); overflow-x: auto; }
    .table-responsive { width: 100%; overflow-x: auto; }
    .admin-table { width: 100%; min-width: 860px; }
    .mono-id { font-family: monospace; font-size: 13px; font-weight: 600; }
    .primary-text { font-size: 13px; font-weight: 500; }
    .sub-text { font-size: 12px; color: var(--vl-text-secondary); }
    .align-right { text-align: right; }
    .risk-callout {
      margin-top: 4px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #b45309;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .risk-callout mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .reject-callout { margin-top: 4px; font-size: 11px; color: #b91c1c; max-width: 220px; }
    .action-group { display: inline-flex; gap: 8px; justify-content: flex-end; }
    .empty-state {
      text-align: center;
      padding: 48px 16px !important;
      color: var(--vl-text-secondary);
    }
    .empty-state mat-icon { font-size: 36px; width: 36px; height: 36px; opacity: 0.5; }
  `],
})
export class PayoutQueueComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly items = signal<Withdrawal[]>([]);
  readonly statusFilter = signal<WithdrawalStatus | 'ALL'>('ALL');
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(15);
  readonly totalElements = signal<number>(0);
  readonly isLoading = signal<boolean>(false);
  readonly mutatingId = signal<number | null>(null);

  readonly displayedColumns = ['reference', 'user', 'destination', 'amount', 'status', 'actions'];

  ngOnInit(): void {
    this.loadQueue();
  }

  loadQueue(): void {
    this.isLoading.set(true);
    this.adminApi
      .getAllWithdrawals(this.statusFilter(), this.pageIndex(), this.pageSize())
      .subscribe({
        next: (page) => {
          this.items.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  onStatusChange(status: WithdrawalStatus | 'ALL'): void {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.pageIndex.set(0);
    this.loadQueue();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadQueue();
  }

  transitionToProcessing(w: Withdrawal): void {
    this.mutatingId.set(w.id);
    this.adminApi.markProcessing(w.id).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.mutatingId.set(null);
        this.snackBar.open(`Withdrawal ${w.withdrawalId} marked as PROCESSING.`, 'OK', {
          duration: 3500,
        });
      },
      error: () => this.mutatingId.set(null),
    });
  }

  approve(w: Withdrawal): void {
    this.mutatingId.set(w.id);
    this.adminApi.approveWithdrawal(w.id).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.mutatingId.set(null);
        this.snackBar.open(`Withdrawal ${w.withdrawalId} APPROVED.`, 'OK', { duration: 3500 });
      },
      error: () => this.mutatingId.set(null),
    });
  }

  openRejectDialog(w: Withdrawal): void {
    const ref = this.dialog.open(RejectWithdrawalDialogComponent, {
      width: '440px',
      data: w,
    });

    ref.afterClosed().subscribe((reason: string | undefined) => {
      if (!reason) return;
      this.mutatingId.set(w.id);
      this.adminApi.rejectWithdrawal(w.id, reason).subscribe({
        next: (updated) => {
          this.replaceRow(updated);
          this.mutatingId.set(null);
          this.snackBar.open(
            `Withdrawal ${w.withdrawalId} rejected and ${w.vesAmount} VES reversed.`,
            'OK',
            { duration: 4500 }
          );
        },
        error: () => this.mutatingId.set(null),
      });
    });
  }

  private replaceRow(updated: Withdrawal): void {
    this.items.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
  }
}