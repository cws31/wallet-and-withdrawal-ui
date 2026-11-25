import { CurrencyType } from './wallet.models';

export type WithdrawalStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type FraudDecision = 'ALLOW' | 'REVIEW' | 'BLOCK';

export interface PayoutOption {
  id: number;
  payoutMethodId: number;
  payoutAmount: number;    // Fiat denomination (e.g. 10, 25, 50... 1000)
  currency: string;        // Fiat currency (e.g. "INR")
  currencyAmount: number;  // VES cost required
}

export interface PayoutMethod {
  id: number;
  code: string;
  name: string;
  options: PayoutOption[];
}

export interface CreateWithdrawalRequest {
  payoutMethodId: number;
  payoutOptionId: number;
  payoutDetails: string;
}

export interface Withdrawal {
  id: number;
  withdrawalId: string;
  userId: number;
  userEmail?: string;
  payoutMethodId: number;
  payoutMethodCode?: string;
  payoutMethodName?: string;
  payoutOptionId: number;
  fiatAmount?: number;
  fiatCurrency?: string;
  vesAmount: number;
  payoutDetails: string;
  status: WithdrawalStatus;
  rejectionReason?: string;
  reviewNote?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationResult {
  walletId: number;
  currency: CurrencyType;
  currentBalance: number;
  calculatedLedgerDelta: number;
  discrepancy: number;
  reconciled: boolean;
  checkedAt?: string;
}