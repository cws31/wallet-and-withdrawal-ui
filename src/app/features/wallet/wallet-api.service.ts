import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
    return this.http.get<Wallet>(this.baseUrl);
  }

  getSummary(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(`${this.baseUrl}/summary`);
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

    return this.http.get<PageResponse<WalletTransaction>>(`${this.baseUrl}/transactions`, {
      params,
    });
  }
}