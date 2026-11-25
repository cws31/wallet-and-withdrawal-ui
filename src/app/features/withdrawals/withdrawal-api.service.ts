import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.models';
import {
  CreateWithdrawalRequest,
  Withdrawal,
  WithdrawalStatus,
} from '../../core/models/withdrawal.models';

@Injectable({ providedIn: 'root' })
export class WithdrawalApiService {
  private readonly http = inject(HttpClient);
  private readonly payoutsUrl = `${environment.apiBaseUrl}/payouts`;
  private readonly withdrawalsUrl = `${environment.apiBaseUrl}/withdrawals`;

  getPayoutConfiguration(): Observable<any> {
    return this.http.get<any>(`${this.payoutsUrl}/configuration`);
  }

  createWithdrawal(
    payload: CreateWithdrawalRequest,
    idempotencyKey: string
  ): Observable<Withdrawal> {
    const headers = new HttpHeaders().set('Idempotency-Key', idempotencyKey);
    return this.http
      .post<any>(this.withdrawalsUrl, payload, { headers })
      .pipe(map((res) => this.normalizeWithdrawal(res?.data ?? res)));
  }

  getWithdrawals(
    status?: WithdrawalStatus | 'ALL',
    page = 0,
    size = 10
  ): Observable<PageResponse<Withdrawal>> {
    // Backend expects 1-indexed 'page' and 'limit'
    let params = new HttpParams()
      .set('page', (page + 1).toString())
      .set('limit', size.toString());

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http.get<any>(this.withdrawalsUrl, { params }).pipe(
      map((res) => {
        const data = res?.data ?? res;
        const rawContent: any[] = Array.isArray(data)
          ? data
          : data?.content ?? data?.withdrawals ?? data?.items ?? [];

        const content = rawContent.map((w) => this.normalizeWithdrawal(w));

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

  getWithdrawalById(withdrawalId: string): Observable<Withdrawal> {
    return this.http
      .get<any>(`${this.withdrawalsUrl}/${withdrawalId}`)
      .pipe(map((res) => this.normalizeWithdrawal(res?.data ?? res)));
  }

  cancelWithdrawal(withdrawalId: number | string): Observable<Withdrawal> {
    return this.http
      .patch<any>(`${this.withdrawalsUrl}/${withdrawalId}/cancel`, {})
      .pipe(map((res) => this.normalizeWithdrawal(res?.data ?? res)));
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