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

  beforeEach(() => {
    jest.clearAllMocks();
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

    const middleware = createAuthenticationMiddleware({ jwksUrl, issuer });
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
      role: "ARTIST"
    });
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

    const middleware = createAuthenticationMiddleware({ jwksUrl, issuer });
    const request = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as Request;

    const next = jest.fn();
    await new Promise<void>((resolve) => {
      const captureNext = jest.fn((...args: unknown[]) => {
        next(...args);
        resolve();
      });
      middleware(request, {} as Response, captureNext);
    });

    expect(next).toHaveBeenCalledTimes(1);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
    expect((error as AppError).code).toBe("Unauthorized");
  });
});
