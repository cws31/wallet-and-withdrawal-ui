import { inject, Injectable, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, tap } from 'rxjs';
import { IdempotencyService } from '../../core/idempotency/idempotency.service';
import {
  CreateWithdrawalRequest,
  PayoutMethod,
  PayoutOption,
  Withdrawal,
  WithdrawalStatus,
} from '../../core/models/withdrawal.models';
import { WalletStore } from '../wallet/wallet.store';
import { WithdrawalApiService } from './withdrawal-api.service';

@Injectable({ providedIn: 'root' })
export class WithdrawalStore {
  private readonly api = inject(WithdrawalApiService);
  private readonly idempotency = inject(IdempotencyService);
  private readonly walletStore = inject(WalletStore);
  private readonly snackBar = inject(MatSnackBar);

  // Payout configuration signals
  readonly payoutMethods = signal<PayoutMethod[]>([]);
  readonly allOptions = signal<PayoutOption[]>([]);
  readonly isLoadingConfig = signal<boolean>(false);

  // Withdrawal list & pagination signals
  readonly withdrawals = signal<Withdrawal[]>([]);
  readonly statusFilter = signal<WithdrawalStatus | 'ALL'>('ALL');
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalWithdrawals = signal<number>(0);
  readonly isLoadingList = signal<boolean>(false);

  // Mutation flags
  readonly isSubmitting = signal<boolean>(false);
  readonly cancellingId = signal<number | null>(null);

  loadConfiguration(): void {
    this.isLoadingConfig.set(true);
    this.api.getPayoutConfiguration().subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          const activeMethods = res.filter((m) => m.active);
          this.payoutMethods.set(activeMethods);
          const flattened = activeMethods.flatMap((m) => m.options ?? []);
          this.allOptions.set(flattened.filter((o) => o.active));
        } else {
          const activeMethods = (res.methods ?? []).filter((m) => m.active);
          this.payoutMethods.set(activeMethods);
          const nested = activeMethods.flatMap((m) => m.options ?? []);
          const combined = (res.options ?? nested).filter((o) => o.active);
          this.allOptions.set(combined);
        }
        this.isLoadingConfig.set(false);
      },
      error: () => {
        this.isLoadingConfig.set(false);
      },
    });
  }

  submitWithdrawal(payload: CreateWithdrawalRequest): Observable<Withdrawal> {
    this.isSubmitting.set(true);
    const key = this.idempotency.resolveKey(payload);

    return this.api.createWithdrawal(payload, key).pipe(
      tap({
        next: (created) => {
          this.isSubmitting.set(false);
          this.idempotency.clear();
          // Refresh wallet balances immediately (VES is deducted on ALLOW, held on REVIEW)
          this.walletStore.refreshBalances();

          if (created.reviewNote) {
            this.snackBar.open(
              'Withdrawal queued for security review. VES balance will be debited upon approval.',
              'OK',
              { duration: 6000 }
            );
          } else {
            this.snackBar.open(
              `Withdrawal ${created.withdrawalId} created (${created.vesAmount} VES debited).`,
              'OK',
              { duration: 4500 }
            );
          }
        },
        error: () => {
          // Keep idempotency key intact so user can retry identical payload safely
          this.isSubmitting.set(false);
        },
      })
    );
  }

  loadWithdrawals(): void {
    this.isLoadingList.set(true);
    this.api
      .getWithdrawals(this.statusFilter(), this.pageIndex(), this.pageSize())
      .subscribe({
        next: (page) => {
          this.withdrawals.set(page.content ?? []);
          this.totalWithdrawals.set(page.totalElements ?? 0);
          this.isLoadingList.set(false);
        },
        error: () => {
          this.isLoadingList.set(false);
        },
      });
  }

  setStatusFilter(status: WithdrawalStatus | 'ALL'): void {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.pageIndex.set(0);
    this.loadWithdrawals();
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageIndex.set(pageIndex);
    this.pageSize.set(pageSize);
    this.loadWithdrawals();
  }

  cancelWithdrawal(id: number): void {
    if (this.cancellingId() !== null) return;
    this.cancellingId.set(id);

    this.api.cancelWithdrawal(id).subscribe({
      next: (updated) => {
        this.cancellingId.set(null);
        this.withdrawals.update((list) =>
          list.map((w) => (w.id === updated.id ? updated : w))
        );
        // Trigger balance refresh since backend runs a CORRECTION reversal transaction
        this.walletStore.refreshBalances();
        this.snackBar.open(
          'Withdrawal cancelled and VES balance restored to your wallet.',
          'OK',
          { duration: 4500 }
        );
      },
      error: () => {
        this.cancellingId.set(null);
      },
    });
  }
}