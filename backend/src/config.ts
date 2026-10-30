import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),

  DATABASE_PATH: z.string().min(1).default('./data/qf.db'),

  CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  RPC_URL: z.string().url().default('https://ethereum-sepolia-rpc.publicnode.com'),

  ROUND_ADDRESS: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  ROUND_START_BLOCK: z.coerce.number().int().min(0).optional(),
  ROUND_NAME: z.string().min(1).default('Road to Devcon Quadratic Round'),

  INDEXER_ENABLED: booleanString.default(true),
  INDEXER_POLL_MS: z.coerce.number().int().min(1000).default(15_000),
  INDEXER_CONFIRMATIONS: z.coerce.number().int().min(0).max(64).default(2),
  INDEXER_BATCH_BLOCKS: z.coerce.number().int().min(100).max(50_000).default(4_000),

  ADMIN_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),

  CORS_ORIGINS: z.string().default('*'),

  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  databasePath: string;
  chainId: number;
  rpcUrl: string;
  bootstrapRound: { address: string; startBlock?: number; name: string } | null;
  indexerEnabled: boolean;
  indexerPollMs: number;
  indexerConfirmations: number;
  indexerBatchBlocks: number;
  adminApiKey?: string;
  corsOrigins: string[] | '*';
  rateLimit: { max: number; timeWindow: string };
}

export function parseConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const value = parsed.data;
  const corsOrigins =
    value.CORS_ORIGINS.trim() === '*'
      ? '*'
      : value.CORS_ORIGINS.split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

  return {
    nodeEnv: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    databasePath: value.DATABASE_PATH,
    chainId: value.CHAIN_ID,
    rpcUrl: value.RPC_URL,
    bootstrapRound: value.ROUND_ADDRESS
      ? {
          address: value.ROUND_ADDRESS,
          startBlock: value.ROUND_START_BLOCK,
          name: value.ROUND_NAME,
        }
      : null,
    indexerEnabled: value.INDEXER_ENABLED,
    indexerPollMs: value.INDEXER_POLL_MS,
    indexerConfirmations: value.INDEXER_CONFIRMATIONS,
    indexerBatchBlocks: value.INDEXER_BATCH_BLOCKS,
    adminApiKey: value.ADMIN_API_KEY,
    corsOrigins,
    rateLimit: { max: value.RATE_LIMIT_MAX, timeWindow: value.RATE_LIMIT_WINDOW },
  };
}

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  loadDotenv();
  cached = parseConfig(process.env);
  return cached;
}
