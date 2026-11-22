export type CurrencyType = 'VES' | 'SVES' | 'GEMS' | 'TOKENS' | 'SPINS';

export type TransactionType = 'CREDIT' | 'DEBIT' | 'WITHDRAWAL' | 'CORRECTION';

export type LedgerFilterType = 'ALL' | 'REWARDS' | 'WITHDRAWALS';

export interface Wallet {
  id: number;
  userId: number;
  ves: number;
  sves: number;
  gems: number;
  tokens: number;
  spins: number;
  withdrawnVes: number;
  version: number; // Optimistic lock version
}

export interface WalletSummary {
  balances: Record<CurrencyType, number>;
  withdrawnVes: number;
  totalTransactions: number;
}

export interface WalletTransaction {
  transactionId: string;
  currency: CurrencyType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  transactionType: TransactionType;
  source: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CurrencyCardConfig {
  code: CurrencyType;
  label: string;
  description: string;
  icon: string;
  accentColor: string;
  bgTint: string;
  redeemable?: boolean;
}