import { Injectable } from '@angular/core';
import { CreateWithdrawalRequest } from '../models/withdrawal.models';

@Injectable({ providedIn: 'root' })
export class IdempotencyService {
  private activeKey: string | null = null;
  private activeSignature: string | null = null;

  /**
   * Returns a stable Idempotency-Key (max 100 chars) for identical payloads so network
   * retries return the cached withdrawal, while rotating immediately if any field changes.
   */
  resolveKey(payload: CreateWithdrawalRequest): string {
    const signature = `${payload.payoutMethodId}|${payload.payoutOptionId}|${payload.payoutDetails.trim()}`;

    if (!this.activeKey || this.activeSignature !== signature) {
      this.activeKey = crypto.randomUUID();
      this.activeSignature = signature;
    }

    return this.activeKey;
  }

  clear(): void {
    this.activeKey = null;
    this.activeSignature = null;
  }
}