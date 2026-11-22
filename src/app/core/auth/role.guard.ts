import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/auth.models';
import { AuthService } from './auth.service';

export const roleGuard = (requiredRole: UserRole): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (user && user.role === requiredRole) {
      return true;
    }

    return router.createUrlTree(['/wallet']);
  };
};