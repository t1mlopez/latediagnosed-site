export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  firstName?: string;
  preferredFirstName?: string;
  memberSince?: string;
  permissions: string[];
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number;
}

export interface LoginTransaction {
  codeVerifier: string;
  nonce: string;
  state: string;
  returnTo: string;
  expiresAt: number;
}
