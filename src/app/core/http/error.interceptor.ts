import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const correlationId = err.headers?.get('X-Correlation-ID');
      const backendMsg = err.error?.message || err.error?.error;

      switch (err.status) {
        case 401:
          if (!req.url.includes('/api/auth/login')) {
            authService.clearSession();
            snackBar.open('Session expired (15m security timeout). Please sign in again.', 'OK', {
              duration: 4500,
            });
            router.navigate(['/login']);
          }
          break;

        case 403:
          snackBar.open(
            backendMsg || 'Access denied or security policy blocked this request.',
            'Dismiss',
            { duration: 5000 }
          );
          break;

        case 409:
          snackBar.open(
            backendMsg || 'State conflict detected (concurrent update or duplicate key). Please retry.',
            'OK',
            { duration: 5500 }
          );
          break;

        case 429: {
          const retryAfter = err.headers?.get('Retry-After') || '60';
          snackBar.open(
            `Rate limit reached. Please wait ${retryAfter} seconds before trying again.`,
            'OK',
            { duration: 6000 }
          );
          break;
        }

        default:
          if (err.status >= 400) {
            const ref = correlationId ? ` [Ref: ${correlationId.slice(0, 8)}]` : '';
            snackBar.open(`${backendMsg || 'Unexpected server error.'}${ref}`, 'Close', {
              duration: 5000,
            });
          }
      }

      return throwError(() => err);
    })
  );
};