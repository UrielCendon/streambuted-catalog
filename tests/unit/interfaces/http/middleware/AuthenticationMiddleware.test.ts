import { Request, Response } from "express";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { AppError } from "../../../../../src/application/errors/AppError";
import { createAuthenticationMiddleware } from "../../../../../src/interfaces/http/middleware/AuthenticationMiddleware";

jest.mock("jwks-rsa", () => jest.fn());

describe("AuthenticationMiddleware", () => {
  const jwksUrl = "https://identity.local/api/v1/auth/.well-known/jwks.json";
  const issuer = "http://identity-service-test";
  const kid = "test-kid";
  const accountStatusClient = {
    validateAuthorizationHeader: jest.fn().mockResolvedValue(undefined),
  };

  const runMiddleware = async (authorization: string) => {
    const middleware = createAuthenticationMiddleware({ jwksUrl, issuer, accountStatusClient });
    const request = {
      headers: {
        authorization
      }
    } as Request;

    const next = jest.fn();
    await new Promise<void>((resolve) => {
      middleware(request, {} as Response, (...args: unknown[]) => {
        next(...args);
        resolve();
      });
    });

    return { request, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    accountStatusClient.validateAuthorizationHeader.mockResolvedValue(undefined);
  });

  it("accepts lowercase bearer scheme and normalizes artist role", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        if (requestedKid !== kid) {
          callback(new Error("Unknown kid"));
          return;
        }
        callback(null, { getPublicKey: () => publicKey });
      }
    });

    const token = jwt.sign({ role: "artist" }, privateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      keyid: kid,
      expiresIn: "15m"
    });

    const middleware = createAuthenticationMiddleware({ jwksUrl, issuer, accountStatusClient });
    const request = {
      headers: {
        authorization: `bearer ${token}`
      }
    } as Request;

    const next = jest.fn();
    await new Promise<void>((resolve) => {
      middleware(request, {} as Response, (...args: unknown[]) => {
        next(...args);
        resolve();
      });
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toEqual([]);
    expect(request.authenticatedUser).toEqual({
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      role: "ARTIST",
      authorizationHeader: `bearer ${token}`
    });
    expect(accountStatusClient.validateAuthorizationHeader).toHaveBeenCalledWith(`bearer ${token}`);
  });

  it("rejects JWT payloads with non-string role claims", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (_requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        callback(null, { getPublicKey: () => publicKey });
      }
    });

    const token = jwt.sign({ role: { name: "artist" } }, privateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      keyid: kid,
      expiresIn: "15m"
    });

    const { next } = await runMiddleware(`Bearer ${token}`);

    expect(next).toHaveBeenCalledTimes(1);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
    expect((error as AppError).code).toBe("Unauthorized");
  });

  it("returns 401 when JWT header is missing kid", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (_requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        callback(null, { getPublicKey: () => publicKey });
      }
    });

    const token = jwt.sign({ role: "artist" }, privateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      expiresIn: "15m"
    });

    const { next } = await runMiddleware(`Bearer ${token}`);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
  });

  it("returns 409 only when signing key is not found for kid", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (_requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        const error = new Error("Unable to find a signing key");
        (error as { name?: string }).name = "SigningKeyNotFoundError";
        callback(error);
      }
    });

    const token = jwt.sign({ role: "artist" }, privateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      keyid: kid,
      expiresIn: "15m"
    });

    const { next } = await runMiddleware(`Bearer ${token}`);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(409);
    expect((error as AppError).code).toBe("Conflict");
  });

  it("returns 503 when JWKS client fails", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (_requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        const error = new Error("JWKS endpoint unavailable");
        (error as { name?: string }).name = "JwksError";
        callback(error);
      }
    });

    const token = jwt.sign({ role: "artist" }, privateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      keyid: kid,
      expiresIn: "15m"
    });

    const { next } = await runMiddleware(`Bearer ${token}`);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(503);
    expect((error as AppError).code).toBe("ServiceUnavailable");
  });

  it("returns 401 for invalid signature (not a signing-key mismatch)", async () => {
    const { privateKey: tokenPrivateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    const { publicKey: wrongPublicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (_requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        callback(null, { getPublicKey: () => wrongPublicKey });
      }
    });

    const token = jwt.sign({ role: "artist" }, tokenPrivateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      keyid: kid,
      expiresIn: "15m"
    });

    const { next } = await runMiddleware(`Bearer ${token}`);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
  });

  it("returns 403 when Identity reports a suspended account", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });

    (jwksRsa as unknown as jest.Mock).mockReturnValue({
      getSigningKey: (_requestedKid: string, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
        callback(null, { getPublicKey: () => publicKey });
      }
    });

    accountStatusClient.validateAuthorizationHeader.mockRejectedValue(
      new AppError(
        403,
        "AccountBannedException",
        "La cuenta se encuentra suspendida.",
        {
          code: "ACCOUNT_BANNED",
          banType: "TEMPORARY",
          bannedUntil: "2026-05-22T13:00:00Z",
          remainingSeconds: 600,
        }
      )
    );

    const token = jwt.sign({ role: "artist" }, privateKey, {
      algorithm: "RS256",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      issuer,
      keyid: kid,
      expiresIn: "15m"
    });

    const { next } = await runMiddleware(`Bearer ${token}`);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(403);
    expect((error as AppError).code).toBe("AccountBannedException");
  });
});
