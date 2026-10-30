import type { Log, PublicClient } from 'viem';
import { parseEventLogs, zeroAddress } from 'viem';
import type { Db } from '../db/client.js';
import { getRoundById, listRounds, setLastIndexedBlock, addRoundContribution } from '../db/rounds.js';
import { addProjectContribution, getProject, markProjectWithdrawn, setProjectMatch, upsertProject } from '../db/projects.js';
import { insertContribution } from '../db/contributions.js';
import { upsertMatch } from '../db/matches.js';
import { finishSyncRun, startSyncRun } from '../db/sync-runs.js';
import type { RoundRow } from '../domain/types.js';
import { qfAbi } from '../chain/abi.js';
import { refreshRoundFromChain } from '../services/rounds.js';

export interface IndexerOptions {
  pollMs: number;
  confirmations: number;
  batchBlocks: number;
}

export interface SyncRoundResult {
  round: string;
  fromBlock: number;
  toBlock: number;
  headBlock: number;
  logsProcessed: number;
  skipped: boolean;
  status: 'success' | 'error';
  error?: string;
}

export interface LoggerLike {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
}

/**
 * Decoded event shape used internally. viem's `parseEventLogs` overloads model
 * `strict` decoding with non-optional args, while getLogs returns an untyped log
 * shape, so we bridge the two here once instead of sprinkling casts through the
 * event handlers.
 */
interface DecodedEvent {
  eventName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
  blockNumber: bigint | null;
  logIndex: number;
  transactionHash: `0x${string}`;
}

/**
 * Event-sourced indexer. It replays the contract's logs into SQLite and is
 * idempotent via the (tx_hash, log_index) unique key. Chain confirmations are
 * configurable so a small reorg cannot be indexed before it settles.
 */
export class Indexer {
  private timer: NodeJS.Timeout | null = null;
  private inFlight = false;
  private lastRunAt: string | null = null;

  constructor(
    private readonly db: Db,
    private readonly client: PublicClient,
    private readonly logger: LoggerLike,
    private readonly options: IndexerOptions,
  ) {}

  start(): void {
    if (this.timer) return;
    void this.runOnce().finally(() => {
      this.timer = setInterval(() => {
        void this.runOnce();
      }, this.options.pollMs);
      this.timer.unref?.();
    });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getStatus(): { running: boolean; lastRunAt: string | null } {
    return { running: this.inFlight, lastRunAt: this.lastRunAt };
  }

  async runOnce(): Promise<SyncRoundResult[]> {
    if (this.inFlight) return [];
    this.inFlight = true;

    try {
      const rounds = listRounds(this.db);
      const results: SyncRoundResult[] = [];

      for (const round of rounds) {
        try {
          const result = await this.syncRound(round);
          results.push(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error({ round: round.address, error: message }, 'round sync failed');
          results.push({
            round: round.address,
            fromBlock: round.last_indexed_block,
            toBlock: round.last_indexed_block,
            headBlock: 0,
            logsProcessed: 0,
            skipped: false,
            status: 'error',
            error: message,
          });
        }
      }

      this.lastRunAt = new Date().toISOString();
      return results;
    } finally {
      this.inFlight = false;
    }
  }

  async syncRound(round: RoundRow): Promise<SyncRoundResult> {
    const head = Number(await this.client.getBlockNumber());
    const target = head - this.options.confirmations;

    if (target < 0) {
      return {
        round: round.address,
        fromBlock: round.last_indexed_block,
        toBlock: target,
        headBlock: head,
        logsProcessed: 0,
        skipped: true,
        status: 'success',
      };
    }

    const from = round.last_indexed_block > 0 ? round.last_indexed_block + 1 : round.start_block;

    if (from > target) {
      return {
        round: round.address,
        fromBlock: from,
        toBlock: target,
        headBlock: head,
        logsProcessed: 0,
        skipped: true,
        status: 'success',
      };
    }

    const runId = startSyncRun(this.db, round.id, from, target);
    let processed = 0;
    let batchFrom = from;

    try {
      while (batchFrom <= target) {
        const batchTo = Math.min(batchFrom + this.options.batchBlocks - 1, target);
        const logs = await this.client.getLogs({
          address: round.address,
          fromBlock: BigInt(batchFrom),
          toBlock: BigInt(batchTo),
        });

        const timestamps = await this.fetchBlockTimestamps(logs);
        let batchLogs = 0;

        const transaction = this.db.transaction(() => {
          // `logs` comes back from getLogs with viem's untyped log shape; the ABI
          // below is the single source of truth for decoding.
          const decoded = parseEventLogs({
            abi: qfAbi,
            logs: logs as never,
            strict: false,
          }) as unknown as DecodedEvent[];
          decoded.sort((a, b) => {
            const blockA = Number(a.blockNumber ?? 0n);
            const blockB = Number(b.blockNumber ?? 0n);
            if (blockA !== blockB) return blockA - blockB;
            return (a.logIndex ?? 0) - (b.logIndex ?? 0);
          });

          for (const event of decoded) {
            this.applyEvent(round, event, timestamps);
            processed += 1;
            batchLogs += 1;
          }
        });

        transaction();
        setLastIndexedBlock(this.db, round.id, batchTo);

        // Re-read accounting fields from chain after every batch. This is cheap
        // insurance against missed or out-of-order aggregate events.
        const refreshed = getRoundById(this.db, round.id);
        if (refreshed) {
          try {
            await refreshRoundFromChain(this.db, this.client, refreshed);
          } catch (error) {
            this.logger.warn(
              { round: round.address, error: error instanceof Error ? error.message : String(error) },
              'could not refresh round aggregates from chain',
            );
          }
        }

        this.logger.debug(
          { round: round.address, from: batchFrom, to: batchTo, logs: batchLogs },
          'indexed batch',
        );
        batchFrom = batchTo + 1;
      }

      finishSyncRun(this.db, runId, 'success', processed);
      this.logger.info({ round: round.address, from, to: target, logs: processed }, 'round synced');

      return {
        round: round.address,
        fromBlock: from,
        toBlock: target,
        headBlock: head,
        logsProcessed: processed,
        skipped: false,
        status: 'success',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finishSyncRun(this.db, runId, 'error', processed, message);
      throw error;
    }
  }

  private async fetchBlockTimestamps(logs: Log[]): Promise<Map<number, number>> {
    const unique = [
      ...new Set(
        logs
          .map((log) => (log.blockNumber === null ? null : Number(log.blockNumber)))
          .filter((value): value is number => value !== null),
      ),
    ].slice(0, 50);

    const timestamps = new Map<number, number>();
    await Promise.all(
      unique.map(async (blockNumber) => {
        try {
          const block = await this.client.getBlock({ blockNumber: BigInt(blockNumber) });
          timestamps.set(blockNumber, Number(block.timestamp));
        } catch {
          // Missing timestamps are non-fatal; block numbers are still stored.
        }
      }),
    );
    return timestamps;
  }

  private applyEvent(
    round: RoundRow,
    event: DecodedEvent,
    timestamps: Map<number, number>,
  ): void {
    const blockNumber = event.blockNumber === null ? null : Number(event.blockNumber);
    const timestamp = blockNumber === null ? null : timestamps.get(blockNumber) ?? null;
    const txHash = event.transactionHash;

    switch (event.eventName) {
      case 'ProjectRegistered': {
        upsertProject(this.db, round.id, {
          onchainId: Number(event.args.projectId),
          payout: event.args.payout,
          name: event.args.name,
          metadataUri: event.args.metadataURI,
          registeredBlock: blockNumber,
          registeredTx: txHash,
        });
        break;
      }

      case 'Contribution': {
        const projectId = Number(event.args.projectId);
        this.ensureProject(round, projectId, txHash, blockNumber);

        const inserted = insertContribution(this.db, round.id, {
          onchainProjectId: projectId,
          contributor: event.args.contributor,
          amount: event.args.amount,
          txHash,
          logIndex: event.logIndex,
          blockNumber,
          blockTimestamp: timestamp,
        });

        if (inserted) {
          addProjectContribution(this.db, round.id, projectId, event.args.amount);
          addRoundContribution(this.db, round.id, event.args.amount);
        }
        break;
      }

      case 'MatchFinalized': {
        const projectId = Number(event.args.projectId);
        this.ensureProject(round, projectId, txHash, blockNumber);
        upsertMatch(this.db, round.id, projectId, event.args.score, event.args.matchAmount);
        setProjectMatch(this.db, round.id, projectId, event.args.score, event.args.matchAmount);
        break;
      }

      case 'RoundFinalized': {
        this.db
          .prepare(
            `UPDATE rounds
                SET finalized = 1,
                    total_score = ?,
                    matching_pool_wei = ?,
                    total_match_allocated_wei = ?,
                    unallocated_pool_wei = ?,
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE id = ?`,
          )
          .run(
            event.args.totalScore.toString(),
            event.args.matchingPool.toString(),
            event.args.totalMatchAllocated.toString(),
            (event.args.matchingPool - event.args.totalMatchAllocated).toString(),
            round.id,
          );
        break;
      }

      case 'Withdrawal': {
        const projectId = Number(event.args.projectId);
        this.ensureProject(round, projectId, txHash, blockNumber);
        markProjectWithdrawn(this.db, round.id, projectId, {
          txHash,
          contributions: event.args.contributions,
          match: event.args.matchAmount,
          timestamp,
          blockNumber,
        });
        break;
      }

      case 'EligibilityRootUpdated': {
        this.db.prepare(`UPDATE rounds SET eligibility_root = ? WHERE id = ?`).run(
          event.args.root,
          round.id,
        );
        break;
      }

      case 'PoolFunded':
      case 'UnallocatedPoolReclaimed':
        // Aggregate accounting is refreshed from chain reads after the batch.
        break;

      default:
        break;
    }
  }

  private ensureProject(
    round: RoundRow,
    projectId: number,
    txHash: `0x${string}`,
    blockNumber: number | null,
  ): void {
    if (getProject(this.db, round.id, projectId)) return;

    this.logger.warn(
      { round: round.address, projectId },
      'project event was not indexed before its dependent event; creating a placeholder',
    );

    upsertProject(this.db, round.id, {
      onchainId: projectId,
      payout: zeroAddress,
      name: `Project #${projectId}`,
      metadataUri: '',
      registeredBlock: blockNumber,
      registeredTx: txHash,
    });
  }
}
