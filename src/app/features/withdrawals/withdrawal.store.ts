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
      next: (rawRes: any) => {
        const data = rawRes?.data ?? rawRes;
        const rawMethods: any[] = Array.isArray(data)
          ? data
          : data?.methods ?? data?.payoutMethods ?? [];

        const normalizedMethods: PayoutMethod[] = rawMethods.map((m) => {
          const methodId = Number(m.id);
          const options: PayoutOption[] = (m.options ?? []).map((o: any) => ({
            id: Number(o.id),
            payoutMethodId: methodId,
            payoutAmount: Number(o.payoutAmount),
            currency: o.currency ?? 'INR',
            currencyAmount: Number(o.currencyAmount),
          }));

          return {
            id: methodId,
            code: m.code,
            name: m.name,
            options,
          };
        });

        this.payoutMethods.set(normalizedMethods);
        this.allOptions.set(normalizedMethods.flatMap((m) => m.options));
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