import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppError } from "../../../application/errors/AppError";

interface CatalogJwtPayload extends JwtPayload {
  sub: string;
  role: string;
}

const isCatalogJwtPayload = (value: unknown): value is CatalogJwtPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<CatalogJwtPayload>;
  return (
    typeof payload.sub === "string" &&
    payload.sub.trim().length > 0 &&
    typeof payload.role === "string" &&
    payload.role.trim().length > 0
  );
};

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

const normalizeRole = (role: string): string => {
  const normalizedRole = role.trim().toUpperCase();
  if (normalizedRole.length === 0) {
    return "";
  }

  if (normalizedRole.startsWith("ROLE_")) {
    return normalizedRole.slice(5).trim();
  }

  return normalizedRole;
};

export const createAuthenticationMiddleware =
  (jwtSecret: string) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const token = getBearerToken(request.headers.authorization);
    if (!token) {
      next(new AppError(401, "Unauthorized", "Missing or invalid Authorization header."));
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS512"] });
      if (!isCatalogJwtPayload(decoded)) {
        next(new AppError(401, "Unauthorized", "Invalid JWT payload."));
        return;
      }

      const normalizedRole = normalizeRole(decoded.role);
      if (!normalizedRole) {
        next(new AppError(401, "Unauthorized", "Invalid JWT role claim."));
        return;
      }

      request.authenticatedUser = {
        subject: decoded.sub.trim(),
        role: normalizedRole
      };

      next();
    } catch {
      next(new AppError(401, "Unauthorized", "Invalid or expired JWT token."));
    }
  };
