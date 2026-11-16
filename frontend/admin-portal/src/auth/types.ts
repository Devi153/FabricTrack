export type AdminProfile = {
  email: string;
  userId: string;
  role: "PLATFORM_ADMIN";
  canManageAdmins?: boolean;
};
export type Credentials = { email: string; password: string };
export interface AuthProvider {
  readonly configured: boolean;
  signIn(credentials: Credentials): Promise<void>;
  signOut(): Promise<void>;
  subscribe(listener: (token: string | null) => void): () => void;
}
