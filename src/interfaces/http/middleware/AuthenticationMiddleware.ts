import { NextFunction, Request, Response as ExpressResponse } from "express";
import jwt, { JwtHeader, JwtPayload } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { AppError } from "../../../application/errors/AppError";

interface CatalogJwtPayload extends JwtPayload {
  sub: string;
  role: string;
}

interface AccountBannedPayload {
  error?: string;
  code?: string;
  message?: string;
  banType?: "TEMPORARY" | "PERMANENT";
  bannedUntil?: string | null;
  remainingSeconds?: number;
}

interface IdentityAccountStatusClient {
  validateAuthorizationHeader(authorizationHeader: string): Promise<void>;
}

const RESOURCE_CHANGED_MESSAGE =
  "El recurso original ha cambiado. Vuelve a iniciar sesion e intentalo de nuevo.";

const JWKS_UNAVAILABLE_MESSAGE =
  "Esta funcion no esta disponible en este momento. Intenta de nuevo mas tarde.";

const ACCOUNT_BANNED_MESSAGE =
  "La cuenta se encuentra suspendida.";

const SESSION_EXPIRED_MESSAGE =
  "Tu sesion expiro. Inicia sesion nuevamente.";

const SESSION_INVALID_MESSAGE =
  "No se pudo validar tu sesion. Inicia sesion nuevamente.";

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  inner?: unknown;
  cause?: unknown;
};

const unwrapJwtVerifyError = (error: unknown): unknown => {
  let current: unknown = error;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") {
      return current;
    }

    const maybeError = current as ErrorLike;
    const inner = maybeError.inner;
    if (inner && inner !== current) {
      current = inner;
      continue;
    }

    const cause = maybeError.cause;
    if (cause && cause !== current) {
      current = cause;
      continue;
    }

    return current;
  }

  return current;
};

const getErrorName = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const maybeError = error as ErrorLike;
  return typeof maybeError.name === "string" ? maybeError.name : "";
};

const getErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const maybeError = error as ErrorLike;
  return typeof maybeError.message === "string" ? maybeError.message : "";
};

const isSigningKeyNotFoundError = (error: unknown): boolean => {
  const name = getErrorName(error);
  if (name === "SigningKeyNotFoundError") {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  if (!message) {
    return false;
  }

  // Keep this narrow: only treat explicit "kid not found" situations as conflict.
  if (
    message.includes("unknown kid") ||
    message.includes("no matching") ||
    message.includes("signing key not found") ||
    message.includes("unable to find a signing key") ||
    message.includes("unable to find signing key")
  ) {
    return true;
  }

  return false;
};

const isJwksUnavailableError = (error: unknown): boolean => {
  const name = getErrorName(error);

  // jwks-rsa uses these names for network/rate-limit/format problems.
  if (name === "JwksError" || name === "JwksRateLimitError" || name === "JwksTimeoutError") {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  if (!message) {
    return false;
  }

  // Common network/availability failures.
  if (
    message.includes("ecconnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    message.includes("jwks endpoint unavailable") ||
    message.includes("rate limit")
  ) {
    return true;
  }

  return false;
};

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

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const isAccountBannedPayload = (value: unknown): value is AccountBannedPayload => {
  if (!isObject(value)) {
    return false;
  }

  return value.code === "ACCOUNT_BANNED" || value.error === "AccountBannedException";
};

const parseJsonSafely = async (response: globalThis.Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const createIdentityAccountStatusClient = (identityBaseUrl: string): IdentityAccountStatusClient => {
  const normalizedBaseUrl = identityBaseUrl.replace(/\/$/, "");

  return {
    async validateAuthorizationHeader(authorizationHeader: string): Promise<void> {
      let response: globalThis.Response;

      try {
        response = await fetch(`${normalizedBaseUrl}/api/v1/auth/validate`, {
          method: "GET",
          headers: {
            Authorization: authorizationHeader,
          },
        });
      } catch {
        throw new AppError(503, "ServiceUnavailable", JWKS_UNAVAILABLE_MESSAGE);
      }

      if (response.ok) {
        return;
      }

      const payload = await parseJsonSafely(response);
      if (response.status === 403 && isAccountBannedPayload(payload)) {
        throw new AppError(
          403,
          "AccountBannedException",
          typeof payload.message === "string" && payload.message.trim()
            ? payload.message
            : ACCOUNT_BANNED_MESSAGE,
          payload
        );
      }

      if (response.status === 401) {
        throw new AppError(401, "Unauthorized", SESSION_EXPIRED_MESSAGE);
      }

      throw new AppError(503, "ServiceUnavailable", JWKS_UNAVAILABLE_MESSAGE);
    }
  };
};

export const createAuthenticationMiddleware =
  (options: {
    jwksUrl: string;
    issuer?: string;
    audience?: string;
    identityBaseUrl?: string;
    accountStatusClient?: IdentityAccountStatusClient;
  }) => {
    const jwksUrl = options.jwksUrl?.trim();
    if (!jwksUrl) {
      throw new Error("Invalid JWT_JWKS_URL: must be a non-empty URL.");
    }

    try {
      const parsedJwksUrl = new URL(jwksUrl);
      if (!parsedJwksUrl.protocol || !parsedJwksUrl.host) {
        throw new Error("Invalid absolute URL.");
      }
    } catch {
      throw new Error("Invalid JWT_JWKS_URL: must be a valid absolute URL.");
    }

    const identityBaseUrl = options.identityBaseUrl?.trim() || options.issuer?.trim() || "";
    if (!options.accountStatusClient && !identityBaseUrl) {
      throw new Error("Invalid identity base URL: must be configured.");
    }

    const accountStatusClient = options.accountStatusClient
      ?? createIdentityAccountStatusClient(identityBaseUrl);

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
        const error = new Error("Missing 'kid' in JWT header.");
        (error as { name?: string }).name = "JwtKidMissingError";
        callback(error);
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

    return (request: Request, _response: ExpressResponse, next: NextFunction): void => {
      const token = getBearerToken(request.headers.authorization);
      if (!token) {
        next(new AppError(401, "Unauthorized", SESSION_EXPIRED_MESSAGE));
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
            const rootError = unwrapJwtVerifyError(error);

            if (isSigningKeyNotFoundError(rootError)) {
              next(new AppError(409, "Conflict", RESOURCE_CHANGED_MESSAGE));
              return;
            }

            if (isJwksUnavailableError(rootError)) {
              next(new AppError(503, "ServiceUnavailable", JWKS_UNAVAILABLE_MESSAGE));
              return;
            }

            next(new AppError(401, "Unauthorized", SESSION_EXPIRED_MESSAGE));
            return;
          }

          if (!isCatalogJwtPayload(decoded)) {
            next(new AppError(401, "Unauthorized", SESSION_INVALID_MESSAGE));
            return;
          }

          const normalizedRole = normalizeRole(decoded.role);
          if (!normalizedRole) {
            next(new AppError(401, "Unauthorized", SESSION_INVALID_MESSAGE));
            return;
          }

          accountStatusClient
            .validateAuthorizationHeader(request.headers.authorization as string)
            .then(() => {
              request.authenticatedUser = {
                subject: decoded.sub.trim(),
                role: normalizedRole,
                authorizationHeader: request.headers.authorization
              };

              next();
            })
            .catch((statusError: unknown) => {
              next(statusError);
            });
        }
      );
    };
  };
