export interface User {
  id: string;
  email: string;
  name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  town_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
