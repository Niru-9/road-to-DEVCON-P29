import { createChainClient } from './chain/reader.js';
import { Indexer, type LoggerLike } from './chain/indexer.js';
import type { AppConfig } from './config.js';
import type { AppContext } from './context.js';
import { closeDatabase, openDatabase } from './db/client.js';

export interface Runtime {
  ctx: AppContext;
  close: () => void;
}

/**
 * Builds the shared runtime used by the HTTP server and every CLI command.
 * The public client is read-only: this process never holds a private key.
 */
export function createRuntime(config: AppConfig, logger: LoggerLike): Runtime {
  const db = openDatabase(config.databasePath);
  const client = createChainClient({ chainId: config.chainId, rpcUrl: config.rpcUrl });
  const indexer = new Indexer(db, client, logger, {
    pollMs: config.indexerPollMs,
    confirmations: config.indexerConfirmations,
    batchBlocks: config.indexerBatchBlocks,
  });

  return {
    ctx: { config, db, client, indexer },
    close: () => {
      indexer.stop();
      closeDatabase(db);
    },
  };
}

export const silentLogger: LoggerLike = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};
