import type { PublicClient } from 'viem';
import type { Db } from '../db/client.js';
import { allProjects } from '../db/projects.js';
import { allContributions } from '../db/contributions.js';
import { allMatches } from '../db/matches.js';
import type { RoundRow } from '../domain/types.js';
import { readNativeBalance } from '../chain/reader.js';
import { computeResults, type ComputeResultsInput, type Results } from './results.js';

export function loadResultsInput(
  db: Db,
  round: RoundRow,
  onchainBalanceWei?: bigint,
): ComputeResultsInput {
  return {
    round,
    projects: allProjects(db, round.id),
    contributions: allContributions(db, round.id),
    matches: allMatches(db, round.id),
    onchainBalanceWei,
  };
}

export function computeRoundResults(db: Db, round: RoundRow): Results {
  return computeResults(loadResultsInput(db, round));
}

/** Best-effort chain balance read; public RPC failures must not break results. */
export async function tryReadBalance(
  client: PublicClient,
  address: `0x${string}`,
): Promise<{ balance: bigint | null; error: string | null }> {
  try {
    return { balance: await readNativeBalance(client, address), error: null };
  } catch (error) {
    return { balance: null, error: error instanceof Error ? error.message : String(error) };
  }
}
