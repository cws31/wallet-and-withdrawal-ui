export type UserRole = 'USER' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface JwtClaims {
  sub: string;
  userId: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  tokenType?: string;
  expiresIn?: number;
  userId?: number;
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface CurrentUser {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  expiresAt: number; // Epoch ms
}