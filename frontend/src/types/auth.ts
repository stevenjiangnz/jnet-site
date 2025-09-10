export interface AllowedUser {
  email: string;
  created_at: string;
  updated_at: string;
  added_by: string;
}

export interface AuthError {
  code: 'NOT_ALLOWLISTED' | 'AUTH_ERROR' | 'UNKNOWN_ERROR';
  message: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAuthorized: boolean;
  user: any | null;
  loading: boolean;
  error: AuthError | null;
}