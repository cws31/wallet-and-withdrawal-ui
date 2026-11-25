import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.models';
import { CurrencyType, WalletTransaction } from '../../core/models/wallet.models';
import {
  ReconciliationResult,
  Withdrawal,
  WithdrawalStatus,
} from '../../core/models/withdrawal.models';

export interface AdminWalletAdjustmentRequest {
  userId: number;
  currency: CurrencyType;
  amount: number;
  source?: string;
  referenceId?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiBaseUrl;

  getAllWithdrawals(
    status?: WithdrawalStatus | 'ALL',
    page = 0,
    size = 15
  ): Observable<PageResponse<Withdrawal>> {
    return this.getAdminWithdrawals(status, page, size);
  }

  getAdminWithdrawals(
    status?: WithdrawalStatus | 'ALL',
    page = 0,
    size = 15
  ): Observable<PageResponse<Withdrawal>> {
    // Backend expects 1-indexed 'page' and 'limit'
    let params = new HttpParams()
      .set('page', (page + 1).toString())
      .set('limit', size.toString());

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http.get<any>(`${this.apiBase}/withdrawals/admin`, { params }).pipe(
      map((res) => {
        const data = res?.data ?? res;
        const rawContent: any[] = Array.isArray(data)
          ? data
          : data?.content ?? data?.withdrawals ?? data?.items ?? [];

        const content: Withdrawal[] = rawContent.map((w) => this.normalizeWithdrawal(w));

        return {
          content,
          totalElements: Number(data?.totalElements ?? data?.total ?? content.length),
          totalPages: Number(data?.totalPages ?? 1),
          size: Number(data?.size ?? size),
          number: Number(data?.number ?? page),
          first: Boolean(data?.first ?? page === 0),
          last: Boolean(data?.last ?? true),
        } satisfies PageResponse<Withdrawal>;
      })
    );
  }

  markProcessing(withdrawalId: number | string): Observable<Withdrawal> {
    return this.http
      .patch<any>(`${this.apiBase}/withdrawals/${withdrawalId}/processing`, {})
      .pipe(map((res) => this.normalizeWithdrawal(res?.data ?? res)));
  }

  approveWithdrawal(withdrawalId: number | string): Observable<Withdrawal> {
    return this.http
      .patch<any>(`${this.apiBase}/withdrawals/${withdrawalId}/approve`, {})
      .pipe(map((res) => this.normalizeWithdrawal(res?.data ?? res)));
  }

  rejectWithdrawal(
    withdrawalId: number | string,
    rejectionReason: string,
    reviewNote?: string
  ): Observable<Withdrawal> {
    // Matches @RequestParam String rejectionReason & @RequestParam(required = false) String reviewNote
    let params = new HttpParams().set('rejectionReason', rejectionReason);
    if (reviewNote) {
      params = params.set('reviewNote', reviewNote);
    }

    return this.http
      .patch<any>(`${this.apiBase}/withdrawals/${withdrawalId}/reject`, null, { params })
      .pipe(map((res) => this.normalizeWithdrawal(res?.data ?? res)));
  }

  creditWallet(payload: AdminWalletAdjustmentRequest): Observable<WalletTransaction> {
    return this.adjustWalletBalance('credit', payload);
  }

  debitWallet(payload: AdminWalletAdjustmentRequest): Observable<WalletTransaction> {
    return this.adjustWalletBalance('debit', payload);
  }

  adjustWalletBalance(
    mode: 'credit' | 'debit',
    payload: AdminWalletAdjustmentRequest
  ): Observable<WalletTransaction> {
    return this.http
      .post<any>(`${this.apiBase}/admin/wallet/${mode}`, payload)
      .pipe(map((res) => res?.data ?? res));
  }

  reconcileWallet(
    walletId: number,
    currency: CurrencyType
  ): Observable<ReconciliationResult> {
    return this.http
      .get<any>(`${this.apiBase}/admin/reconcile/wallet/${walletId}`, {
        params: new HttpParams().set('currency', currency),
      })
      .pipe(map((res) => res?.data ?? res));
  }

  private normalizeWithdrawal(w: any): Withdrawal {
    return {
      ...w,
      id: w?.withdrawalId ?? w?.id,
      vesAmount: Number(w?.vesAmount ?? w?.currencyAmount ?? w?.amount ?? 0),
      fiatAmount: Number(w?.fiatAmount ?? w?.payoutAmount ?? 0),
      fiatCurrency: w?.fiatCurrency ?? w?.currency ?? 'INR',
    };
  }
}