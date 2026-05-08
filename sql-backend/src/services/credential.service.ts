export interface CredentialConfig {
  userId: string;
  password: string;
  server: string;
  dbType: string;
}

export const validateCredential = (credential: CredentialConfig): boolean =>
  !!(credential.userId && credential.password && credential.server);

export const credentialService = { validateCredential };
