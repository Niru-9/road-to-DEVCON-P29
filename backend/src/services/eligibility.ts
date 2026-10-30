import type { Address, Hex } from 'viem';
import type { Db } from '../db/client.js';
import {
  countEligibilityEntries,
  findEligibilityEntry,
  getActiveEligibilityRoot,
  listEligibilityEntries,
  listEligibilityRoots,
  replaceEligibilitySet,
  type EligibilityEntryInput,
} from '../db/eligibility.js';
import type { EligibilityRootRow, RoundRow } from '../domain/types.js';
import { AppError } from '../errors.js';
import {
  buildMerkleTree,
  getProof,
  leafForAddress,
  verifyMerkleProof,
} from './merkle.js';
import { buildSetEligibilityRootTx, type TransactionRequest } from './calldata.js';

export interface ImportEligibilityResult {
  root: Hex;
  leafCount: number;
  duplicates: Address[];
  source: string;
  onchainRoot: Hex | null;
  rootMatchesOnchain: boolean;
  transaction: TransactionRequest;
  warnings: string[];
}

function uniqueEntries(entries: EligibilityEntryInput[]): {
  unique: EligibilityEntryInput[];
  duplicates: Address[];
} {
  const seen = new Set<string>();
  const unique: EligibilityEntryInput[] = [];
  const duplicates: Address[] = [];

  for (const entry of entries) {
    const key = entry.address.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(entry.address);
      continue;
    }
    seen.add(key);
    unique.push(entry);
  }

  return { unique, duplicates };
}

export function importEligibility(
  db: Db,
  round: RoundRow,
  entries: EligibilityEntryInput[],
  source: string,
): ImportEligibilityResult {
  const { unique, duplicates } = uniqueEntries(entries);
  if (unique.length === 0) {
    throw new AppError(400, 'empty_eligibility_set', 'No eligible addresses were supplied');
  }

  const tree = buildMerkleTree(unique.map((entry) => entry.address));
  const rootRow = replaceEligibilitySet(db, round.id, unique, tree.root, unique.length, source);

  const onchainRoot = round.eligibility_root;
  const warnings: string[] = [];

  if (round.finalized) {
    warnings.push('The round is already finalized; a new root can no longer be published on-chain.');
  } else if (round.end_time !== null && Math.floor(Date.now() / 1000) > round.end_time) {
    warnings.push('The round has ended; setEligibilityRoot() will revert on-chain.');
  }
  if (duplicates.length > 0) {
    warnings.push(
      `${duplicates.length} duplicate address(es) were removed before building the Merkle tree.`,
    );
  }
  if (onchainRoot && onchainRoot.toLowerCase() !== tree.root.toLowerCase()) {
    warnings.push(
      'The locally built root differs from the root currently stored on-chain. Publish the new root to activate it.',
    );
  }

  return {
    root: tree.root,
    leafCount: rootRow.leaf_count,
    duplicates,
    source,
    onchainRoot,
    rootMatchesOnchain: Boolean(onchainRoot && onchainRoot.toLowerCase() === tree.root.toLowerCase()),
    transaction: buildSetEligibilityRootTx(round, tree.root),
    warnings,
  };
}

export interface EligibilityProofResult {
  address: Address;
  eligible: boolean;
  root: Hex;
  leaf: Hex;
  proof: Hex[];
  leafCount: number;
  onchainRoot: Hex | null;
  rootMatchesOnchain: boolean;
  warnings: string[];
}

export function getEligibilityProof(
  db: Db,
  round: RoundRow,
  address: Address,
): EligibilityProofResult {
  const activeRoot = getActiveEligibilityRoot(db, round.id);
  if (!activeRoot) {
    throw new AppError(
      404,
      'no_eligibility_root',
      'No eligibility set has been imported for this round yet',
    );
  }

  const entry = findEligibilityEntry(db, round.id, address);
  const leaf = leafForAddress(address);
  const allEntries = listEligibilityEntries(db, round.id);
  const tree = buildMerkleTree(allEntries.map((row) => row.address));
  const onchainRoot = round.eligibility_root;
  const rootMatchesOnchain = Boolean(
    onchainRoot && onchainRoot.toLowerCase() === tree.root.toLowerCase(),
  );
  const warnings = rootMatchesOnchain
    ? []
    : [
        onchainRoot
          ? 'The local eligibility root differs from the on-chain root. Publish the imported root and sync before contributing.'
          : 'No eligibility root has been published on-chain yet. Publish the imported root and sync before contributing.',
      ];

  if (!entry) {
    return {
      address,
      eligible: false,
      root: tree.root,
      leaf,
      proof: [],
      leafCount: allEntries.length,
      onchainRoot,
      rootMatchesOnchain,
      warnings,
    };
  }

  const proof = getProof(tree, address);
  if (!proof) {
    throw new AppError(500, 'proof_generation_failed', 'Eligibility entry exists but no proof was generated');
  }

  if (!verifyMerkleProof(proof, tree.root, leaf)) {
    throw new AppError(500, 'proof_verification_failed', 'Generated Merkle proof failed local verification');
  }

  return {
    address,
    eligible: true,
    root: tree.root,
    leaf,
    proof,
    leafCount: allEntries.length,
    onchainRoot,
    rootMatchesOnchain,
    warnings,
  };
}

export interface EligibilitySummary {
  activeRoot: {
    root: Hex;
    leafCount: number;
    source: string | null;
    createdAt: string;
  } | null;
  onchainRoot: Hex | null;
  rootMatchesOnchain: boolean;
  addresses: number;
  history: Array<{
    root: Hex;
    leafCount: number;
    source: string | null;
    active: boolean;
    createdAt: string;
  }>;
}

export function getEligibilitySummary(
  db: Db,
  round: RoundRow,
  includeAddresses = false,
): EligibilitySummary & { entries?: Array<{ address: Address; label: string | null; source: string | null }> } {
  const active = getActiveEligibilityRoot(db, round.id);
  const roots = listEligibilityRoots(db, round.id);
  const entries = includeAddresses
    ? listEligibilityEntries(db, round.id).map((row) => ({
        address: row.address,
        label: row.label,
        source: row.source,
      }))
    : undefined;

  return {
    activeRoot: active
      ? {
          root: active.root,
          leafCount: active.leaf_count,
          source: active.source,
          createdAt: active.created_at,
        }
      : null,
    onchainRoot: round.eligibility_root,
    rootMatchesOnchain: Boolean(
      active && round.eligibility_root && active.root.toLowerCase() === round.eligibility_root.toLowerCase(),
    ),
    addresses: countEligibilityEntries(db, round.id),
    history: roots.map((root: EligibilityRootRow) => ({
      root: root.root,
      leafCount: root.leaf_count,
      source: root.source,
      active: Boolean(root.active),
      createdAt: root.created_at,
    })),
    ...(entries ? { entries } : {}),
  };
}
