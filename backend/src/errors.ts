export type ErrorDetails = Record<string, unknown> | unknown[] | undefined;

/**
 * Typed application error. The Fastify error handler turns this into:
 *   { "error": { "code": "...", "message": "...", "details": ... } }
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details?: ErrorDetails): AppError {
  return new AppError(400, code, message, details);
}

export function notFound(code: string, message: string): AppError {
  return new AppError(404, code, message);
}

export function conflict(code: string, message: string, details?: ErrorDetails): AppError {
  return new AppError(409, code, message, details);
}

export function forbidden(code: string, message: string): AppError {
  return new AppError(403, code, message);
}

export function serviceUnavailable(code: string, message: string): AppError {
  return new AppError(503, code, message);
}
