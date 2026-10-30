#!/usr/bin/env node
/**
 * Configures the deployed QuadraticFundingRound on Sepolia in one run.
 *
 * What it does, in order:
 *   1. Checks the signer is the round operator and the round is still open.
 *   2. Builds the eligibility Merkle tree from a CSV and publishes it if it differs.
 *   3. Registers every project in the JSON file that is not registered yet.
 *   4. Funds the matching pool with POOL_ETH (skipped when zero/empty).
 *
 * The private key is read from the environment (or backend/.env) and never
 * written anywhere. Nothing is signed unless DRY_RUN is false.
 *
 * Usage (from the repo root, PowerShell):
 *
 *   $env:PRIVATE_KEY = "0x...."       # operator key, this shell session only
 *   $env:POOL_ETH     = "0.01"        # optional, ETH to add to the pool
 *   node backend/scripts/configure-round.mjs
 *
 * Read-only preview:
 *
 *   $env:DRY_RUN = "true"
 *   node backend/scripts/configure-round.mjs
 *
 * Optional overrides: RPC_URL, ROUND_ADDRESS, ELIGIBILITY_FILE, PROJECTS_FILE.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  concat,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  formatEther,
  getAddress,
  http,
  keccak256,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const here = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(here, '..');
const repoDir = resolve(backendDir, '..');

dotenv.config({ path: resolve(backendDir, '.env'), quiet: true });

const deployment = JSON.parse(
  readFileSync(resolve(repoDir, 'deployments', 'sepolia.json'), 'utf8'),
);

const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const ROUND = getAddress(process.env.ROUND_ADDRESS || deployment.address);
const PRIVATE_KEY = (process.env.PRIVATE_KEY || '').trim();
const POOL_ETH = (process.env.POOL_ETH || '').trim();
const DRY_RUN = /^(1|true|yes)$/i.test((process.env.DRY_RUN || '').trim());
const ELIGIBILITY_FILE = resolve(
  repoDir,
  process.env.ELIGIBILITY_FILE || 'fixtures/eligibility.local.csv',
);
const PROJECTS_FILE = resolve(repoDir, process.env.PROJECTS_FILE || 'fixtures/projects.local.json');

const ABI = JSON.parse(
  readFileSync(
    resolve(
      repoDir,
      'contracts',
      'solc-out',
      'contracts_src_QuadraticFundingRound_sol_QuadraticFundingRound.abi',
    ),
    'utf8',
  ),
);

// ---------------------------------------------------------------------------
// Merkle helpers — must match backend/src/services/merkle.ts and the contract.
// ---------------------------------------------------------------------------
const leafForAddress = (address) =>
  keccak256(encodeAbiParameters([{ type: 'address' }], [getAddress(address)]));

const compareHex = (a, b) => {
  const left = BigInt(a);
  const right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
};

const hashPair = (a, b) =>
  compareHex(a, b) <= 0 ? keccak256(concat([a, b])) : keccak256(concat([b, a]));

function buildMerkleTree(addresses) {
  const seen = new Set();
  const unique = [];
  for (const raw of addresses) {
    const address = getAddress(raw);
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(address);
  }
  if (unique.length === 0) throw new Error('Eligibility file contains no addresses');

  const entries = unique
    .map((address) => ({ address, leaf: leafForAddress(address) }))
    .sort((a, b) => compareHex(a.leaf, b.leaf))
    .map((entry, index) => ({ ...entry, index }));

  const layers = [entries.map((entry) => entry.leaf)];
  let current = layers[0];
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(current[i + 1] ? hashPair(current[i], current[i + 1]) : current[i]);
    }
    layers.push(next);
    current = next;
  }

  return { root: layers[layers.length - 1][0], entries, layers };
}

function proofFor(tree, address) {
  const entry = tree.entries.find((e) => e.address.toLowerCase() === address.toLowerCase());
  if (!entry) return null;
  const proof = [];
  let index = entry.index;
  for (let level = 0; level < tree.layers.length - 1; level++) {
    const sibling = index ^ 1;
    if (sibling < tree.layers[level].length) proof.push(tree.layers[level][sibling]);
    index >>= 1;
  }
  return proof;
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------
function readEligibility(file) {
  const addresses = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const first = trimmed.split(',')[0].trim();
    if (!first || first.toLowerCase() === 'address') continue;
    addresses.push(first);
  }
  return addresses;
}

function readProjects(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${file} must contain a JSON array`);
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Project ${index} is not an object`);
    if (typeof entry.payout !== 'string') throw new Error(`Project ${index} is missing "payout"`);
    if (typeof entry.name !== 'string' || entry.name.length === 0) {
      throw new Error(`Project ${index} is missing a non-empty "name"`);
    }
    const metadataUri =
      typeof entry.metadataUri === 'string'
        ? entry.metadataUri
        : typeof entry.metadataURI === 'string'
          ? entry.metadataURI
          : '';
    return { payout: getAddress(entry.payout), name: entry.name, metadataUri };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!PRIVATE_KEY && !DRY_RUN) {
    console.error('PRIVATE_KEY is not set. Set it in your shell for this session only:');
    console.error('  $env:PRIVATE_KEY = "0x..."');
    process.exit(1);
  }

  const account = PRIVATE_KEY
    ? privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`)
    : null;
  const transport = http(RPC_URL);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = account
    ? createWalletClient({ account, chain: sepolia, transport })
    : null;

  const read = (functionName, args = []) =>
    publicClient.readContract({ address: ROUND, abi: ABI, functionName, args });

  const chainId = await publicClient.getChainId();
  if (chainId !== sepolia.id) {
    throw new Error(`RPC is chain ${chainId}, expected Sepolia ${sepolia.id}`);
  }

  const owner = await read('owner');
  if (account && owner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(
      `Signer ${account.address} is not the operator (${owner}). Use the operator key.`,
    );
  }
  if (!account) {
    console.log(`Signer      (dry run, no key) — operator is ${owner}`);
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  const endTime = await read('endTime');
  if (now >= endTime) {
    throw new Error(
      `Round ended at ${new Date(Number(endTime) * 1000).toISOString()}; setup is closed.`,
    );
  }

  const eligibility = readEligibility(ELIGIBILITY_FILE);
  const tree = buildMerkleTree(eligibility);
  const projects = readProjects(PROJECTS_FILE);
  const poolWei = POOL_ETH ? parseEther(POOL_ETH) : 0n;

  const currentRoot = await read('eligibilityRoot');
  const projectCount = await read('projectCount');
  const matchingPool = await read('matchingPool');

  console.log(`Round       ${ROUND}`);
  if (account) {
    console.log(`Signer      ${account.address} (operator)`);
  }
  console.log(`Ends        ${new Date(Number(endTime) * 1000).toISOString()}`);
  console.log(`Root now    ${currentRoot}`);
  console.log(`Root file   ${tree.root} (${tree.entries.length} leaves)`);
  console.log(`Projects    ${projectCount} registered, file has ${projects.length}`);
  console.log(`Pool now    ${formatEther(matchingPool)} ETH`);
  console.log(`Mode        ${DRY_RUN ? 'DRY RUN (nothing sent)' : 'LIVE'}`);
  console.log('');

  if (DRY_RUN) {
    console.log('Planned transactions:');
    if (currentRoot.toLowerCase() !== tree.root.toLowerCase()) {
      console.log(`  setEligibilityRoot(${tree.root})`);
    } else {
      console.log('  setEligibilityRoot: already current, skipped');
    }
    for (const project of projects) {
      const registered = await read('isRegisteredPayout', [project.payout]);
      console.log(
        registered
          ? `  registerProject(${project.payout}): already registered, skipped`
          : `  registerProject(${project.payout}, "${project.name}", "${project.metadataUri}")`,
      );
    }
    console.log(
      poolWei > 0n ? `  fundPool() with ${formatEther(poolWei)} ETH` : '  fundPool: POOL_ETH not set, skipped',
    );
    console.log('');
    console.log('Eligibility proofs (for contribute()):');
    for (const entry of tree.entries) {
      console.log(
        `  ${entry.address}  proof=${JSON.stringify(proofFor(tree, entry.address))}`,
      );
    }
    return;
  }

  const send = async (label, request) => {
    const hash = await walletClient.writeContract(request);
    console.log(`${label}\n  tx ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error(`${label} reverted in ${hash}`);
    console.log(`  confirmed in block ${receipt.blockNumber}, gas ${receipt.gasUsed}`);
    return receipt;
  };

  if (currentRoot.toLowerCase() !== tree.root.toLowerCase()) {
    await send('setEligibilityRoot', {
      address: ROUND,
      abi: ABI,
      functionName: 'setEligibilityRoot',
      args: [tree.root],
    });
  } else {
    console.log('setEligibilityRoot: already current, skipped');
  }

  let registeredNow = 0;
  for (const project of projects) {
    const registered = await read('isRegisteredPayout', [project.payout]);
    if (registered) {
      console.log(`registerProject ${project.payout}: already registered, skipped`);
      continue;
    }
    await send(`registerProject "${project.name}"`, {
      address: ROUND,
      abi: ABI,
      functionName: 'registerProject',
      args: [project.payout, project.name, project.metadataUri],
    });
    registeredNow += 1;
  }

  if (poolWei > 0n) {
    await send(`fundPool ${formatEther(poolWei)} ETH`, {
      address: ROUND,
      abi: ABI,
      functionName: 'fundPool',
      value: poolWei,
    });
  } else {
    console.log('fundPool: POOL_ETH not set, skipped');
  }

  const finalProjects = await read('projectCount');
  const finalPool = await read('matchingPool');
  console.log('');
  console.log('Done. On-chain state now:');
  console.log(`  eligibilityRoot  ${await read('eligibilityRoot')}`);
  console.log(`  projectCount     ${finalProjects} (registered this run: ${registeredNow})`);
  console.log(`  matchingPool     ${formatEther(finalPool)} ETH`);
  console.log(`  finalized        ${await read('finalized')}`);
  console.log('');
  console.log('Eligibility proofs (for contribute()):');
  for (const entry of tree.entries) {
    console.log(`  ${entry.address}  proof=${JSON.stringify(proofFor(tree, entry.address))}`);
  }
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
