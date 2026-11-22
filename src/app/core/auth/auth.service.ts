import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  CurrentUser,
  JwtClaims,
  LoginRequest,
  RegisterRequest,
} from '../models/auth.models';

const TOKEN_STORAGE_KEY = 'veloop_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _currentUser = signal<CurrentUser | null>(this.restoreUserFromStorage());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => {
    const user = this._currentUser();
    return !!user && user.expiresAt > Date.now();
  });
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ADMIN');

  constructor() {
    const existing = this._currentUser();
    if (existing) {
      this.scheduleAutoLogout(existing.expiresAt);
    }
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, payload)
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, payload)
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  fetchCurrentUserId(): Observable<{ userId: number } | number> {
    return this.http.get<{ userId: number } | number>(`${this.baseUrl}/me`);
  }

  getToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return null;

    const user = this._currentUser();
    if (user && user.expiresAt <= Date.now()) {
      this.clearSession();
      return null;
    }
    return token;
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    this._currentUser.set(null);
  }

  private handleAuthSuccess(res: AuthResponse): void {
    if (!res?.token) return;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, res.token);

    const parsed = this.decodeToken(res.token, res.name);
    if (parsed && parsed.expiresAt > Date.now()) {
      this._currentUser.set(parsed);
      this.scheduleAutoLogout(parsed.expiresAt);
    } else {
      this.clearSession();
    }
  }

  private restoreUserFromStorage(): CurrentUser | null {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return null;

    const user = this.decodeToken(token);
    if (!user || user.expiresAt <= Date.now()) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return user;
  }

  private decodeToken(token: string, fallbackName?: string): CurrentUser | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const claims: JwtClaims = JSON.parse(jsonPayload);
      const email = claims.email || claims.sub;

      return {
        userId: claims.userId,
        email,
        name: fallbackName || email.split('@')[0],
        role: claims.role || 'USER',
        expiresAt: claims.exp * 1000,
      };
    } catch {
      return null;
    }
  }

  private scheduleAutoLogout(expiresAtMs: number): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
    }
    const msUntilExpiry = Math.max(0, expiresAtMs - Date.now());
    this.expiryTimer = setTimeout(() => {
      this.logout();
    }, msUntilExpiry);
  }
}