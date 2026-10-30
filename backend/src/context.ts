import type { PublicClient } from 'viem';
import type { AppConfig } from './config.js';
import type { Db } from './db/client.js';
import type { Indexer } from './chain/indexer.js';

export interface AppContext {
  config: AppConfig;
  db: Db;
  client: PublicClient;
  indexer: Indexer;
}
