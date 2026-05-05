export interface AuthenticatedUser {
  subject: string;
  role: string;
  authorizationHeader?: string;
}
