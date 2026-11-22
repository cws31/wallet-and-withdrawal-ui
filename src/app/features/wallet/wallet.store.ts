import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  CurrencyCardConfig,
  LedgerFilterType,
  Wallet,
  WalletSummary,
  WalletTransaction,
} from '../../core/models/wallet.models';
import { WalletApiService } from './wallet-api.service';

@Injectable({ providedIn: 'root' })
export class WalletStore {
  private readonly api = inject(WalletApiService);

  // Core state signals
  readonly wallet = signal<Wallet | null>(null);
  readonly summary = signal<WalletSummary | null>(null);
  readonly transactions = signal<WalletTransaction[]>([]);

  // Pagination & Filter signals
  readonly filterType = signal<LedgerFilterType>('ALL');
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalTransactions = signal<number>(0);

  // Loading signals
  readonly isLoadingBalances = signal<boolean>(false);
  readonly isLoadingLedger = signal<boolean>(false);

  // Derived 5-currency card list with live amounts
  readonly currencyCards = computed(() => {
    const w = this.wallet();
    const s = this.summary();

    const getBal = (code: 'ves' | 'sves' | 'gems' | 'tokens' | 'spins', upper: 'VES' | 'SVES' | 'GEMS' | 'TOKENS' | 'SPINS') =>
      w?.[code] ?? s?.balances?.[upper] ?? 0;

    const definitions: (CurrencyCardConfig & { balance: number })[] = [
      {
        code: 'VES',
        label: 'Redeemable VES',
        description: 'Available for cash-out withdrawals',
        icon: 'payments',
        accentColor: '#1d4ed8',
        bgTint: '#eff6ff',
        redeemable: true,
        balance: getBal('ves', 'VES'),
      },
      {
        code: 'SVES',
        label: 'Staked VES',
        description: 'Special & locked reward holdings',
        icon: 'lock_clock',
        accentColor: '#6d28d9',
        bgTint: '#f5f3ff',
        balance: getBal('sves', 'SVES'),
      },
      {
        code: 'GEMS',
        label: 'Gems',
        description: 'In-app gaming reward balance',
        icon: 'diamond',
        accentColor: '#047857',
        bgTint: '#ecfdf5',
        balance: getBal('gems', 'GEMS'),
      },
      {
        code: 'TOKENS',
        label: 'Tokens',
        description: 'Task & activity completion units',
        icon: 'toll',
        accentColor: '#b45309',
        bgTint: '#fffbeb',
        balance: getBal('tokens', 'TOKENS'),
      },
      {
        code: 'SPINS',
        label: 'Spins',
        description: 'Lucky wheel spin credits',
        icon: 'autorenew',
        accentColor: '#be185d',
        bgTint: '#fdf2f8',
        balance: getBal('spins', 'SPINS'),
      },
    ];

    return definitions;
  });

  readonly availableVes = computed(() => this.wallet()?.ves ?? this.summary()?.balances?.VES ?? 0);
  readonly withdrawnVes = computed(() => this.wallet()?.withdrawnVes ?? this.summary()?.withdrawnVes ?? 0);

  loadDashboard(): void {
    this.refreshBalances();
    this.loadTransactions();
  }

  refreshBalances(): void {
    this.isLoadingBalances.set(true);
    forkJoin({
      wallet: this.api.getWallet(),
      summary: this.api.getSummary(),
    }).subscribe({
      next: ({ wallet, summary }) => {
        this.wallet.set(wallet);
        this.summary.set(summary);
        this.isLoadingBalances.set(false);
      },
      error: () => {
        this.isLoadingBalances.set(false);
      },
    });
  }

  loadTransactions(): void {
    this.isLoadingLedger.set(true);
    this.api
      .getTransactions(this.filterType(), this.pageIndex(), this.pageSize())
      .subscribe({
        next: (page) => {
          this.transactions.set(page.content ?? []);
          this.totalTransactions.set(page.totalElements ?? 0);
          this.isLoadingLedger.set(false);
        },
        error: () => {
          this.isLoadingLedger.set(false);
        },
      });
  }

  setFilter(type: LedgerFilterType): void {
    if (this.filterType() === type) return;
    this.filterType.set(type);
    this.pageIndex.set(0);
    this.loadTransactions();
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageIndex.set(pageIndex);
    this.pageSize.set(pageSize);
    this.loadTransactions();
  }
}