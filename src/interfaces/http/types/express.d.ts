import { AuthenticatedUser } from "../../../application/auth/AuthenticatedUser";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

export {};
