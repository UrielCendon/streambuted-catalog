import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../application/errors/AppError";
import { logger } from "../../../infrastructure/logging/logger";
import { inferPublicErrorCode, resolvePublicMessage } from "./PublicErrorPolicy";

const flattenDetails = (details: unknown): Record<string, unknown> => {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }

  return details as Record<string, unknown>;
};

export const notFoundMiddleware = (_request: Request, _response: Response, next: NextFunction): void => {
  next(new AppError(404, "NotFound", "La ruta solicitada no existe."));
};

const mapPrismaKnownError = (error: Error): AppError | null => {
  const prismaError = error as Error & { code?: string };
  if (error.name !== "PrismaClientKnownRequestError" || typeof prismaError.code !== "string") {
    return null;
  }

  switch (prismaError.code) {
    case "P2002":
      return new AppError(409, "Conflict", "Ya existe un recurso con esos datos.");
    case "P2003":
      return new AppError(409, "Conflict", "La operacion referencia un recurso que no existe.");
    case "P2025":
      return new AppError(404, "NotFound", "El recurso solicitado no existe o ya no esta disponible.");
    default:
      return null;
  }
};

export const errorHandlerMiddleware = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    const publicCode = inferPublicErrorCode(error.statusCode, error.code, error.message);
    const publicMessage = resolvePublicMessage(publicCode, error.message);
    const logPayload = {
      code: error.code,
      publicCode,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details ?? null
    };

    if (error.statusCode >= 500) {
      logger.error("Handled AppError:", logPayload);
    } else {
      logger.warn("Handled AppError:", logPayload);
    }

    response.status(error.statusCode).json({
      error: error.code,
      code: publicCode,
      ...flattenDetails(error.details),
      message: publicMessage,
      statusCode: error.statusCode,
      details: error.details ?? null,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const mappedError = mapPrismaKnownError(error);
  if (mappedError) {
    errorHandlerMiddleware(mappedError, _request, response, _next);
    return;
  }

  logger.error("Unhandled error:", {
    name: error.name,
    message: error.message,
    stack: error.stack ?? null
  });

  response.status(500).json({
    error: "InternalServerError",
    code: "unexpected_operation_failure",
    message: "No se pudo completar la accion en este momento. Intenta de nuevo mas tarde.",
    statusCode: 500,
    timestamp: new Date().toISOString()
  });
};
