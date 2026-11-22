import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        #drawer
        class="shell-sidenav"
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset()"
      >
        <div class="sidenav-brand">
          <div class="brand-badge">VL</div>
          <div class="brand-text">
            <span class="title">VELoop</span>
            <span class="subtitle">Rewards Ledger</span>
          </div>
        </div>

        <mat-nav-list class="nav-list">
          <div class="nav-section-label">MY ACCOUNT</div>
          @for (item of userNavItems; track item.route) {
            <a
              mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active-link"
              (click)="isHandset() && drawer.close()"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }

          @if (authService.isAdmin()) {
            <mat-divider class="nav-divider"></mat-divider>
            <div class="nav-section-label">ADMIN OPERATIONS</div>
            @for (item of adminNavItems; track item.route) {
              <a
                mat-list-item
                [routerLink]="item.route"
                routerLinkActive="active-link"
                (click)="isHandset() && drawer.close()"
              >
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="shell-content">
        <mat-toolbar class="top-toolbar">
          @if (isHandset()) {
            <button mat-icon-button (click)="drawer.toggle()" aria-label="Toggle navigation">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <span class="toolbar-spacer"></span>

          @if (user(); as currentUser) {
            <span class="role-chip" [class.admin]="currentUser.role === 'ADMIN'">
              {{ currentUser.role }}
            </span>

            <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
              <mat-icon>account_circle</mat-icon>
              <span class="user-email">{{ currentUser.email }}</span>
              <mat-icon>expand_more</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu">
              <div class="menu-header" disabled>
                <strong>{{ currentUser.name }}</strong>
                <small>User ID #{{ currentUser.userId }}</small>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="authService.logout()">
                <mat-icon>logout</mat-icon>
                <span>Sign Out</span>
              </button>
            </mat-menu>
          }
        </mat-toolbar>

        <main class="main-viewport">
          <div class="content-wrapper">
            <router-outlet></router-outlet>
          </div>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .shell-container {
      height: 100vh;
      background: var(--vl-bg-canvas);
    }
    .shell-sidenav {
      width: 248px;
      background: var(--vl-surface);
      border-right: 1px solid var(--vl-border);
    }
    .sidenav-brand {
      height: 64px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--vl-border);
    }
    .brand-badge {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #1d4ed8;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      display: grid;
      place-items: center;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .brand-text .title {
      font-weight: 700;
      font-size: 16px;
    }
    .brand-text .subtitle {
      font-size: 11px;
      color: var(--vl-text-secondary);
    }
    .nav-list {
      padding: 12px 10px;
    }
    .nav-section-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #64748b;
      padding: 8px 14px 4px;
    }
    .nav-divider {
      margin: 12px 0;
    }
    .active-link {
      background: #eff6ff !important;
      color: #1d4ed8 !important;
      border-radius: 8px;
      font-weight: 500;
    }
    .top-toolbar {
      background: var(--vl-surface);
      border-bottom: 1px solid var(--vl-border);
      height: 64px;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .toolbar-spacer {
      flex: 1 1 auto;
    }
    .role-chip {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      margin-right: 12px;
    }
    .role-chip.admin {
      background: #fef3c7;
      color: #92400e;
    }
    .user-menu-btn {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .user-email {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }
    .menu-header {
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      font-size: 13px;
    }
    .menu-header small {
      color: var(--vl-text-secondary);
    }
    .main-viewport {
      padding: 24px;
    }
    .content-wrapper {
      max-width: 1240px;
      margin: 0 auto;
    }
    @media (max-width: 600px) {
      .main-viewport {
        padding: 16px;
      }
      .user-email {
        display: none;
      }
    }
  `],
})
export class AppShellComponent {
  readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly user = this.authService.currentUser;

  readonly isHandset = toSignal(
    this.breakpointObserver.observe([Breakpoints.Handset]).pipe(map((res) => res.matches)),
    { initialValue: false }
  );

  readonly userNavItems: NavItem[] = [
    { label: 'Wallet & Ledger', route: '/wallet', icon: 'account_balance_wallet' },
    { label: 'Withdrawals', route: '/withdrawals', icon: 'payments' },
    { label: 'Request Payout', route: '/withdrawals/new', icon: 'send_money' },
  ];

  readonly adminNavItems: NavItem[] = [
    { label: 'Payout Queue', route: '/admin/payouts', icon: 'fact_check' },
    { label: 'Credit / Debit Wallet', route: '/admin/wallet-ops', icon: 'tune' },
    { label: 'Ledger Reconciliation', route: '/admin/reconciliation', icon: 'balance' },
  ];
}