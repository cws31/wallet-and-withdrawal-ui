import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card vl-card" appearance="outlined">
        <div class="brand-header">
          <div class="logo-mark">VL</div>
          <div>
            <h1>VELoop Rewards</h1>
            <p>Sign in to manage your multi-currency ledger & payouts</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-icon matPrefix>mail_outline</mat-icon>
            @if (form.controls.email.hasError('required')) {
              <mat-error>Email is required</mat-error>
            } @else if (form.controls.email.hasError('email')) {
              <mat-error>Enter a valid email address</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input
              matInput
              [type]="hidePassword() ? 'password' : 'text'"
              formControlName="password"
              autocomplete="current-password"
            />
            <mat-icon matPrefix>lock_outline</mat-icon>
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="hidePassword.set(!hidePassword())"
              [attr.aria-label]="'Toggle password visibility'"
            >
              <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.controls.password.hasError('required')) {
              <mat-error>Password is required</mat-error>
            }
          </mat-form-field>

          @if (errorMessage()) {
            <div class="error-banner" role="alert">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="submit-btn"
            [disabled]="form.invalid || isSubmitting()"
          >
            @if (isSubmitting()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <span>Sign In</span>
            }
          </button>
        </form>

        <div class="auth-footer">
          <span>New to VELoop?</span>
          <a routerLink="/register">Create an account</a>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
    }
    .brand-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 28px;
    }
    .logo-mark {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #1d4ed8;
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .brand-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .brand-header p {
      margin: 2px 0 0;
      font-size: 13px;
      color: var(--vl-text-secondary);
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 13px;
    }
    .submit-btn {
      height: 44px;
      margin-top: 8px;
      font-weight: 500;
    }
    .auth-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--vl-border);
      display: flex;
      justify-content: center;
      gap: 6px;
      font-size: 14px;
      color: var(--vl-text-secondary);
    }
    .auth-footer a {
      color: var(--vl-primary);
      font-weight: 500;
      text-decoration: none;
    }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const target = this.authService.isAdmin() ? '/admin/payouts' : '/wallet';
        this.router.navigate([target]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Invalid credentials or account temporarily locked.'
        );
      },
    });
  }
}