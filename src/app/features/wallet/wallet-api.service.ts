import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.models';
import {
  LedgerFilterType,
  Wallet,
  WalletSummary,
  WalletTransaction,
} from '../../core/models/wallet.models';

@Injectable({ providedIn: 'root' })
export class WalletApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/wallet`;

  getWallet(): Observable<Wallet> {
    return this.http.get<any>(this.baseUrl).pipe(
      map((res) => {
        const data = res?.data ?? res;
        return {
          id: data?.id ?? data?.walletId ?? 0,
          userId: data?.userId ?? 0,
          ves: Number(data?.ves ?? data?.VES ?? 0),
          sves: Number(data?.sves ?? data?.SVES ?? 0),
          gems: Number(data?.gems ?? data?.GEMS ?? 0),
          tokens: Number(data?.tokens ?? data?.TOKENS ?? 0),
          spins: Number(data?.spins ?? data?.SPINS ?? 0),
          withdrawnVes: Number(data?.withdrawnVes ?? data?.withdrawn_ves ?? 0),
          version: Number(data?.version ?? 0),
        } satisfies Wallet;
      })
    );
  }

  getSummary(): Observable<WalletSummary> {
    return this.http.get<any>(`${this.baseUrl}/summary`).pipe(
      map((res) => {
        const data = res?.data ?? res;
        const rawBalances = data?.balances ?? data;
        return {
          balances: {
            VES: Number(rawBalances?.VES ?? rawBalances?.ves ?? 0),
            SVES: Number(rawBalances?.SVES ?? rawBalances?.sves ?? 0),
            GEMS: Number(rawBalances?.GEMS ?? rawBalances?.gems ?? 0),
            TOKENS: Number(rawBalances?.TOKENS ?? rawBalances?.tokens ?? 0),
            SPINS: Number(rawBalances?.SPINS ?? rawBalances?.spins ?? 0),
          },
          withdrawnVes: Number(data?.withdrawnVes ?? data?.withdrawn_ves ?? 0),
          totalTransactions: Number(data?.totalTransactions ?? data?.transactionCount ?? 0),
        } satisfies WalletSummary;
      })
    );
  }

  getTransactions(
    type: LedgerFilterType = 'ALL',
    page = 0,
    size = 10
  ): Observable<PageResponse<WalletTransaction>> {
    const params = new HttpParams()
      .set('type', type)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<any>(`${this.baseUrl}/transactions`, { params }).pipe(
      map((res) => {
        const data = res?.data ?? res;
        const content = Array.isArray(data)
          ? data
          : data?.content ?? data?.transactions ?? data?.items ?? [];

        return {
          content,
          totalElements: Number(data?.totalElements ?? data?.total ?? content.length),
          totalPages: Number(data?.totalPages ?? 1),
          size: Number(data?.size ?? size),
          number: Number(data?.number ?? data?.page ?? page),
          first: Boolean(data?.first ?? page === 0),
          last: Boolean(data?.last ?? true),
        } satisfies PageResponse<WalletTransaction>;
      })
    );
  }
}