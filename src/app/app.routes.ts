import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'wallet', pathMatch: 'full' },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/pages/wallet-dashboard.component').then(
            (m) => m.WalletDashboardComponent
          ),
      },
      {
        path: 'withdrawals',
        loadComponent: () =>
          import('./features/withdrawals/pages/withdrawal-list.component').then(
            (m) => m.WithdrawalListComponent
          ),
      },
      {
        path: 'withdrawals/new',
        loadComponent: () =>
          import('./features/withdrawals/pages/create-withdrawal.component').then(
            (m) => m.CreateWithdrawalComponent
          ),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('ADMIN')],
        children: [
          { path: '', redirectTo: 'payouts', pathMatch: 'full' },
          {
            path: 'payouts',
            loadComponent: () =>
              import('./features/admin/pages/payout-queue.component').then(
                (m) => m.PayoutQueueComponent
              ),
          },
          {
            path: 'wallet-ops',
            loadComponent: () =>
              import('./features/admin/pages/wallet-adjustments.component').then(
                (m) => m.WalletAdjustmentsComponent
              ),
          },
          {
            path: 'reconciliation',
            loadComponent: () =>
              import('./features/admin/pages/ledger-reconciliation.component').then(
                (m) => m.LedgerReconciliationComponent
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'wallet' },
];