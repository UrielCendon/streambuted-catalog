import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../../../../../src/application/errors/AppError";
import { createAuthenticationMiddleware } from "../../../../../src/interfaces/http/middleware/AuthenticationMiddleware";

describe("AuthenticationMiddleware", () => {
  const jwtSecret = "x".repeat(96);

  it("accepts lowercase bearer scheme and normalizes artist role", () => {
    const token = jwt.sign({ role: "artist" }, jwtSecret, {
      algorithm: "HS512",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb"
    });

    const middleware = createAuthenticationMiddleware(jwtSecret);
    const request = {
      headers: {
        authorization: `bearer ${token}`
      }
    } as Request;

    const next = jest.fn();
    middleware(request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]).toEqual([]);
    expect(request.authenticatedUser).toEqual({
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb",
      role: "ARTIST"
    });
  });

  it("rejects JWT payloads with non-string role claims", () => {
    const token = jwt.sign({ role: { name: "artist" } }, jwtSecret, {
      algorithm: "HS512",
      subject: "9d0c95ba-5fa2-43ee-a8dd-49a151ed36cb"
    });

    const middleware = createAuthenticationMiddleware(jwtSecret);
    const request = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as Request;

    const next = jest.fn();
    middleware(request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);

    const [error] = next.mock.calls[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
    expect((error as AppError).code).toBe("Unauthorized");
  });
});
