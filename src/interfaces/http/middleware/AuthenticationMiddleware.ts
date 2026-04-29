import { NextFunction, Request, Response } from "express";
import jwt, { JwtHeader, JwtPayload } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
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
  (options: { jwksUrl: string; issuer?: string; audience?: string }) => {
    const jwksUrl = options.jwksUrl?.trim();
    if (!jwksUrl) {
      throw new Error("Invalid JWT_JWKS_URL: must be a non-empty URL.");
    }

    try {
      // Validate absolute URL
      // eslint-disable-next-line no-new
      new URL(jwksUrl);
    } catch {
      throw new Error("Invalid JWT_JWKS_URL: must be a valid absolute URL.");
    }

    // JWKS client with caching + basic rate limiting.
    const jwksClient = jwksRsa({
      jwksUri: jwksUrl,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      timeout: 5000
    });

    const getKey: jwt.GetPublicKeyOrSecret = (header: JwtHeader, callback) => {
      const kid = header.kid;
      if (!kid || kid.trim().length === 0) {
        callback(new Error("Missing 'kid' in JWT header."));
        return;
      }

      jwksClient.getSigningKey(kid, (err, key) => {
        if (err || !key) {
          callback(err ?? new Error("Unable to resolve signing key from JWKS."));
          return;
        }

        const publicKey = key.getPublicKey();
        callback(null, publicKey);
      });
    };

    return (request: Request, _response: Response, next: NextFunction): void => {
    const token = getBearerToken(request.headers.authorization);
    if (!token) {
      next(new AppError(401, "Unauthorized", "Missing or invalid Authorization header."));
      return;
    }

      jwt.verify(
        token,
        getKey,
        {
          algorithms: ["RS256"],
          issuer: options.issuer,
          audience: options.audience
        },
        (error, decoded) => {
          if (error) {
            next(new AppError(401, "Unauthorized", "Invalid or expired JWT token."));
            return;
          }

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
        }
      );
    };
  };
