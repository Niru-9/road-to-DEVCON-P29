import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from '../errors.js';

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn(
        { err: error, code: error.code, statusCode: error.statusCode },
        'application error',
      );
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
      return;
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const issues = error.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message,
        code: issue.keyword,
      }));
      request.log.info({ issues }, 'request validation failed');
      reply.status(400).send({
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: issues,
        },
      });
      return;
    }

    if (error.validation) {
      reply.status(400).send({
        error: {
          code: 'validation_error',
          message: error.message,
          details: error.validation,
        },
      });
      return;
    }

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'unhandled request error');
      reply.status(statusCode).send({
        error: {
          code: 'internal_error',
          message:
            process.env.NODE_ENV === 'production'
              ? 'An unexpected error occurred'
              : error.message,
        },
      });
      return;
    }

    reply.status(statusCode).send({
      error: {
        code: error.code ?? 'request_error',
        message: error.message,
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'not_found',
        message: `No route for ${request.method} ${request.url}`,
      },
    });
  });
}
