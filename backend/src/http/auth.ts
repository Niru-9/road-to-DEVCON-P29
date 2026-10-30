import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config.js';
import { AppError } from '../errors.js';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Admin routes are disabled unless ADMIN_API_KEY is configured. The key is read
 * from the environment only; it is never stored in the database or returned.
 */
export function requireAdmin(config: AppConfig) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!config.adminApiKey) {
      throw new AppError(
        503,
        'admin_disabled',
        'The admin API is disabled. Set ADMIN_API_KEY to enable it.',
      );
    }

    const supplied = request.headers['x-admin-key'];
    const value = Array.isArray(supplied) ? supplied[0] : supplied;

    if (!value || !safeEqual(value, config.adminApiKey)) {
      throw new AppError(401, 'unauthorized', 'A valid x-admin-key header is required');
    }
  };
}
