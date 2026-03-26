export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
}

export function fromBackendAuthTokens(authTokens: any): AuthTokens {
  return {
    accessToken: authTokens.accessToken,
    expiresAt: authTokens.expiresAt,
  };
}
