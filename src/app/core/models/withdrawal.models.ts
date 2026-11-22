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
  fiatAmount: number;
  fiatCurrency: string; // e.g. "INR"
  vesRequired: number;
  active: boolean;
}

export interface PayoutMethod {
  id: number;
  code: 'UPI' | 'AMAZON_GIFT_CARD' | 'GOOGLE_PLAY_GIFT_CARD' | 'PAYPAL' | string;
  displayName: string;
  active: boolean;
  options?: PayoutOption[];
}

export interface PayoutConfigurationResponse {
  methods: PayoutMethod[];
  options?: PayoutOption[]; // Supports both nested options on methods or flat lists
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
  userEmail?: string; // Populated in admin list
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