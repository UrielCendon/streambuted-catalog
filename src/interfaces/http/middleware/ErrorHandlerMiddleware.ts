import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../application/errors/AppError";

export const notFoundMiddleware = (_request: Request, _response: Response, next: NextFunction): void => {
  next(new AppError(404, "NotFound", "Route not found."));
};

export const errorHandlerMiddleware = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    const logPayload = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details ?? null
    };

    if (error.statusCode >= 500) {
      console.error("Handled AppError:", logPayload);
    } else {
      console.warn("Handled AppError:", logPayload);
    }

    response.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  console.error("Unhandled error:", {
    name: error.name,
    message: error.message,
    stack: error.stack ?? null
  });

  response.status(500).json({
    error: "InternalServerError",
    message: "An unexpected error occurred.",
    statusCode: 500,
    timestamp: new Date().toISOString()
  });
};
