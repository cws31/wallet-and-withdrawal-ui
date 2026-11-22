import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.models';
import { CurrencyType, WalletTransaction } from '../../core/models/wallet.models';
import {
  ReconciliationResult,
  Withdrawal,
  WithdrawalStatus,
} from '../../core/models/withdrawal.models';

export interface WalletAdjustmentRequest {
  userId: number;
  currency: CurrencyType;
  amount: number;
  source: string;
  referenceId?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  // --- System-Wide Withdrawals ---

  getAllWithdrawals(
    status?: WithdrawalStatus | 'ALL',
    page = 0,
    size = 15
  ): Observable<PageResponse<Withdrawal>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http.get<PageResponse<Withdrawal>>(`${this.apiBase}/withdrawals/admin`, {
      params,
    });
  }

  markProcessing(id: number): Observable<Withdrawal> {
    return this.http.patch<Withdrawal>(`${this.apiBase}/withdrawals/${id}/processing`, {});
  }

  approveWithdrawal(id: number): Observable<Withdrawal> {
    return this.http.patch<Withdrawal>(`${this.apiBase}/withdrawals/${id}/approve`, {});
  }

  rejectWithdrawal(id: number, reason: string): Observable<Withdrawal> {
    return this.http.patch<Withdrawal>(`${this.apiBase}/withdrawals/${id}/reject`, {
      reason,
      rejectionReason: reason,
    });
  }

  // --- Manual Wallet Credit / Debit ---

  creditWallet(payload: WalletAdjustmentRequest): Observable<WalletTransaction> {
    return this.http.post<WalletTransaction>(`${this.apiBase}/wallet/credit`, payload);
  }

  debitWallet(payload: WalletAdjustmentRequest): Observable<WalletTransaction> {
    return this.http.post<WalletTransaction>(`${this.apiBase}/wallet/debit`, payload);
  }

  // --- Mathematical Ledger Reconciliation ---

  reconcileWallet(
    walletId: number,
    currency: CurrencyType = 'VES'
  ): Observable<ReconciliationResult> {
    const params = new HttpParams().set('currency', currency);
    return this.http.get<ReconciliationResult>(
      `${this.apiBase}/admin/reconciliation/wallet/${walletId}`,
      { params }
    );
  }
}