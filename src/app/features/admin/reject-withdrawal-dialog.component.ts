import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Withdrawal } from '../../core/models/withdrawal.models';

@Component({
  selector: 'app-reject-withdrawal-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Reject Withdrawal {{ data.withdrawalId }}</h2>

    <mat-dialog-content>
      <p class="dialog-desc">
        Rejecting this request will immediately trigger a <strong>CORRECTION</strong> ledger entry
        and return <strong>{{ data.vesAmount }} VES</strong> to User #{{ data.userId }}.
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Rejection Reason (Audit Log)</mat-label>
        <textarea
          matInput
          rows="3"
          [formControl]="reasonControl"
          placeholder="e.g., Invalid UPI VPA or failed manual fraud verification"
        ></textarea>
        @if (reasonControl.hasError('required')) {
          <mat-error>A rejection reason is required for audit compliance</mat-error>
        } @else if (reasonControl.hasError('minlength')) {
          <mat-error>Provide at least 5 characters</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="warn"
        [disabled]="reasonControl.invalid"
        (click)="confirm()"
      >
        Reject &amp; Reverse VES
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-desc {
      font-size: 13px;
      color: var(--vl-text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .full-width {
      width: 100%;
    }
  `],
})
export class RejectWithdrawalDialogComponent {
  readonly data = inject<Withdrawal>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RejectWithdrawalDialogComponent>);

  readonly reasonControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5), Validators.maxLength(250)],
  });

  confirm(): void {
    if (this.reasonControl.valid) {
      this.dialogRef.close(this.reasonControl.value.trim());
    }
  }
}