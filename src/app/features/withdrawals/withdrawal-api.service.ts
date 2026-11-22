import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.models';
import {
  CreateWithdrawalRequest,
  PayoutConfigurationResponse,
  PayoutMethod,
  Withdrawal,
  WithdrawalStatus,
} from '../../core/models/withdrawal.models';

@Injectable({ providedIn: 'root' })
export class WithdrawalApiService {
  private readonly http = inject(HttpClient);
  private readonly payoutsUrl = `${environment.apiBaseUrl}/payouts`;
  private readonly withdrawalsUrl = `${environment.apiBaseUrl}/withdrawals`;

  getPayoutConfiguration(): Observable<PayoutConfigurationResponse | PayoutMethod[]> {
    return this.http.get<PayoutConfigurationResponse | PayoutMethod[]>(
      `${this.payoutsUrl}/configuration`
    );
  }

  createWithdrawal(
    payload: CreateWithdrawalRequest,
    idempotencyKey: string
  ): Observable<Withdrawal> {
    const headers = new HttpHeaders().set('Idempotency-Key', idempotencyKey);
    return this.http.post<Withdrawal>(this.withdrawalsUrl, payload, { headers });
  }

  getWithdrawals(
    status?: WithdrawalStatus | 'ALL',
    page = 0,
    size = 10
  ): Observable<PageResponse<Withdrawal>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }

    return this.http.get<PageResponse<Withdrawal>>(this.withdrawalsUrl, { params });
  }

  getWithdrawalById(withdrawalId: string): Observable<Withdrawal> {
    return this.http.get<Withdrawal>(`${this.withdrawalsUrl}/${withdrawalId}`);
  }

  cancelWithdrawal(id: number): Observable<Withdrawal> {
    return this.http.patch<Withdrawal>(`${this.withdrawalsUrl}/${id}/cancel`, {});
  }
}