import { encodeAbiParameters, keccak256 } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  buildMerkleTree,
  dedupeAddresses,
  findEntry,
  getProof,
  hashPair,
  leafForAddress,
  verifyMerkleProof,
} from '../src/services/merkle.js';

const addresses = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333',
  '0x4444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555',
] as const;

function independentLeaf(address: `0x${string}`): `0x${string}` {
  return keccak256(encodeAbiParameters([{ type: 'address' }], [address]));
}

function independentPair(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  return BigInt(a) <= BigInt(b)
    ? keccak256(`0x${a.slice(2)}${b.slice(2)}`)
    : keccak256(`0x${b.slice(2)}${a.slice(2)}`);
}

describe('eligibility Merkle tree', () => {
  it('uses keccak256(abi.encode(address)) leaves', () => {
    for (const address of addresses) {
      expect(leafForAddress(address)).toBe(independentLeaf(address));
    }
  });

  it('builds a deterministic root with sorted leaves and sorted pairs', () => {
    const tree = buildMerkleTree([...addresses]);
    const sorted = addresses.map(independentLeaf).sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
    expect(tree.leaves).toEqual(sorted);

    // Rebuild by hand for five leaves: pair, pair, promote odd node, pair, root.
    const level0 = sorted;
    const level1 = [
      independentPair(level0[0]!, level0[1]!),
      independentPair(level0[2]!, level0[3]!),
      level0[4]!,
    ];
    const level2 = [
      independentPair(level1[0]!, level1[1]!),
      level1[2]!,
    ];
    const root = independentPair(level2[0]!, level2[1]!);
    expect(tree.root).toBe(root);
  });

  it('produces proofs that verify for every member, including odd layers', () => {
    const tree = buildMerkleTree([...addresses]);
    for (const address of addresses) {
      const proof = getProof(tree, address);
      expect(proof).not.toBeNull();
      expect(verifyMerkleProof(proof!, tree.root, leafForAddress(address))).toBe(true);
    }
  });

  it('returns null proofs and false verification for non-members', () => {
    const tree = buildMerkleTree([...addresses]);
    const outsider = '0x9999999999999999999999999999999999999999';
    expect(getProof(tree, outsider)).toBeNull();
    expect(findEntry(tree, outsider)).toBeUndefined();
    expect(verifyMerkleProof([], tree.root, leafForAddress(outsider))).toBe(false);
  });

  it('removes duplicates case-insensitively', () => {
    const report = dedupeAddresses([
      '0x1111111111111111111111111111111111111111',
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ]);
    expect(report.unique).toHaveLength(2);
    expect(report.duplicates).toHaveLength(1);
  });

  it('hashes pairs in sorted order regardless of argument order', () => {
    const a = leafForAddress(addresses[0]);
    const b = leafForAddress(addresses[1]);
    expect(hashPair(a, b)).toBe(hashPair(b, a));
  });

  it('refuses to build an empty tree', () => {
    expect(() => buildMerkleTree([])).toThrow();
  });
});
