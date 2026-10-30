import { concat, encodeAbiParameters, getAddress, keccak256, type Address, type Hex } from 'viem';

export interface MerkleEntry {
  address: Address;
  leaf: Hex;
  index: number;
}

export interface MerkleTreeData {
  root: Hex;
  leaves: Hex[];
  layers: Hex[][];
  entries: MerkleEntry[];
}

export interface DuplicateReport {
  unique: Address[];
  duplicates: Address[];
}

/** Deduplicates addresses (case-insensitive) while preserving first-seen order. */
export function dedupeAddresses(addresses: string[]): DuplicateReport {
  const seen = new Set<string>();
  const unique: Address[] = [];
  const duplicates: Address[] = [];

  for (const raw of addresses) {
    const address = getAddress(raw);
    const key = address.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(address);
      continue;
    }
    seen.add(key);
    unique.push(address);
  }

  return { unique, duplicates };
}

/** keccak256(abi.encode(address)) — must match QuadraticFundingRound.eligibilityLeaf. */
export function leafForAddress(address: string): Hex {
  return keccak256(
    encodeAbiParameters([{ type: 'address' }], [getAddress(address)]),
  );
}

function compareHex(a: Hex, b: Hex): number {
  const left = BigInt(a);
  const right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function hashPair(a: Hex, b: Hex): Hex {
  return compareHex(a, b) <= 0 ? keccak256(concat([a, b])) : keccak256(concat([b, a]));
}

/**
 * Builds an OpenZeppelin-compatible sorted-pair Merkle tree over
 * keccak256(abi.encode(address)) leaves. The contract verifies proofs with
 * MerkleProof.verify, which hashes each pair in sorted order.
 */
export function buildMerkleTree(addresses: string[]): MerkleTreeData {
  const { unique } = dedupeAddresses(addresses);
  if (unique.length === 0) {
    throw new Error('Cannot build a Merkle tree with no addresses');
  }

  const entries: MerkleEntry[] = unique
    .map((address) => ({ address, leaf: leafForAddress(address), index: 0 }))
    .sort((a, b) => compareHex(a.leaf, b.leaf));

  const leaves = entries.map((entry) => entry.leaf);
  entries.forEach((entry, index) => {
    entry.index = index;
  });

  const layers: Hex[][] = [leaves.slice()];
  let current = layers[0]!;

  while (current.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      const right = current[i + 1];
      next.push(right ? hashPair(left, right) : left);
    }
    layers.push(next);
    current = next;
  }

  return {
    root: layers[layers.length - 1]![0]!,
    leaves,
    layers,
    entries,
  };
}

export function findEntry(tree: MerkleTreeData, address: string): MerkleEntry | undefined {
  const target = address.toLowerCase();
  return tree.entries.find((entry) => entry.address.toLowerCase() === target);
}

export function getProof(tree: MerkleTreeData, address: string): Hex[] | null {
  const entry = findEntry(tree, address);
  if (!entry) return null;

  const proof: Hex[] = [];
  let index = entry.index;

  for (let level = 0; level < tree.layers.length - 1; level++) {
    const layer = tree.layers[level]!;
    const sibling = index ^ 1;
    if (sibling < layer.length) {
      proof.push(layer[sibling]!);
    }
    index >>= 1;
  }

  return proof;
}

/** Mirrors OpenZeppelin's MerkleProof.verify for sorted pairs. */
export function verifyMerkleProof(proof: Hex[], root: Hex, leaf: Hex): boolean {
  let computed = leaf;
  for (const sibling of proof) {
    computed = hashPair(computed, sibling);
  }
  return computed.toLowerCase() === root.toLowerCase();
}
