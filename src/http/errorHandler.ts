import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  void _next;
  if (error instanceof ZodError)
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.flatten().fieldErrors,
    });
  console.error(error);
  return response.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
};
