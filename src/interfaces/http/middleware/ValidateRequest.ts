import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodEffects } from "zod";
import { AppError } from "../../../application/errors/AppError";

type ValidationSchema = AnyZodObject | ZodEffects<AnyZodObject>;

export const validateRequest = (schema: ValidationSchema) => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const validationResult = schema.safeParse({
      params: request.params,
      query: request.query,
      body: request.body
    });

    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));

      next(new AppError(400, "ValidationError", "Request validation failed.", details));
      return;
    }

    const mutableRequest = request as Request & {
      params: Record<string, unknown>;
      query: Record<string, unknown>;
      body: unknown;
    };

    mutableRequest.params = validationResult.data.params;
    mutableRequest.query = validationResult.data.query;
    mutableRequest.body = validationResult.data.body;

    next();
  };
};
