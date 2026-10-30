import type { FastifyInstance } from 'fastify';
import { decodeFunctionData } from 'viem';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { qfAbi } from '../src/chain/abi.js';
import type { AppContext } from '../src/context.js';
import { parseConfig } from '../src/config.js';
import { closeDatabase, openDatabase, type Db } from '../src/db/client.js';
import { insertContribution } from '../src/db/contributions.js';
import { addProjectContribution, upsertProject } from '../src/db/projects.js';
import { addRoundContribution, upsertRound } from '../src/db/rounds.js';
import {
  addressFor,
  makeProject,
  ONE_ETH,
  OPERATOR,
  PAYOUT_0,
  ROUND_ADDRESS,
} from './fixtures.js';

const ADMIN_KEY = 'test-admin-key';
const SMALL_A = addressFor(1000);
const SMALL_B = addressFor(1001);

function fakeContext(db: Db): AppContext {
  const config = parseConfig({
    NODE_ENV: 'test',
    DATABASE_PATH: ':memory:',
    LOG_LEVEL: 'silent',
    CHAIN_ID: '11155111',
    RPC_URL: 'http://127.0.0.1:8545',
    ADMIN_API_KEY: ADMIN_KEY,
    INDEXER_ENABLED: 'false',
  });

  return {
    config,
    db,
    client: {
      getBlockNumber: async () => 1_000n,
      getBalance: async () => 5n * ONE_ETH,
    } as unknown as AppContext['client'],
    indexer: {
      start: () => undefined,
      stop: () => undefined,
      getStatus: () => ({ running: false, lastRunAt: null }),
      runOnce: async () => [],
      syncRound: async () => {
        throw new Error('sync is not available in tests');
      },
    } as unknown as AppContext['indexer'],
  };
}

describe('HTTP API', () => {
  let app: FastifyInstance;
  let db: Db;

  beforeAll(async () => {
    db = openDatabase(':memory:');
    const round = upsertRound(db, {
      chainId: 11155111,
      address: ROUND_ADDRESS,
      name: 'API Test Round',
      startBlock: 100,
      operator: OPERATOR,
      startTime: 1_700_000_000,
      endTime: 1_700_604_800,
      matchingPool: 10n * ONE_ETH,
      projectCount: 1,
    });

    upsertProject(db, round.id, {
      onchainId: 0,
      payout: PAYOUT_0,
      name: 'Community Project',
      metadataUri: 'ipfs://project',
      registeredBlock: 101,
    });

    for (const [index, amount] of [
      [SMALL_A, ONE_ETH],
      [SMALL_B, ONE_ETH],
    ] as const) {
      const inserted = insertContribution(db, round.id, {
        onchainProjectId: 0,
        contributor: index,
        amount,
        txHash: `0x${index.slice(2)}${'0'.repeat(40)}` as `0x${string}`,
        logIndex: Number(amount % 1000n),
        blockNumber: 200,
        blockTimestamp: 1_700_000_100,
      });
      expect(inserted).toBe(true);
      addProjectContribution(db, round.id, 0, amount);
      addRoundContribution(db, round.id, amount);
    }

    app = await buildApp(fakeContext(db));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDatabase(db);
  });

  it('serves service metadata and health', async () => {
    const root = await app.inject({ method: 'GET', url: '/' });
    expect(root.statusCode).toBe(200);
    expect(root.json()).toMatchObject({ service: 'qf-round-backend', chainId: 11155111 });

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: 'ok', database: 'ok' });

    const ready = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ status: 'ready', chain: { blockNumber: 1000 } });
  });

  it('lists rounds and project results', async () => {
    const rounds = await app.inject({ method: 'GET', url: '/api/v1/rounds' });
    expect(rounds.statusCode).toBe(200);
    const body = rounds.json() as { data: Array<{ address: string; projectCount: number }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.projectCount).toBe(1);

    const results = await app.inject({
      method: 'GET',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/results`,
    });
    expect(results.statusCode).toBe(200);
    const payload = results.json() as {
      data: {
        round: { totalContributionsEth: string; matchingPoolEth: string };
        projects: Array<{ scoreWei: string; matchWei: string; uniqueContributors: number }>;
        integrity: { ok: boolean };
      };
    };
    expect(payload.data.round.totalContributionsEth).toBe('2');
    expect(payload.data.round.matchingPoolEth).toBe('10');
    expect(payload.data.projects[0]!.uniqueContributors).toBe(2);
    expect(payload.data.projects[0]!.matchWei).toBe((10n * ONE_ETH).toString());
    expect(payload.data.integrity.ok).toBe(true);
  });

  it('exports results and contributions as CSV', async () => {
    const results = await app.inject({
      method: 'GET',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/results.csv`,
    });
    expect(results.statusCode).toBe(200);
    expect(results.headers['content-type']).toContain('text/csv');
    expect(results.body).toContain('project_id,project_name');

    const contributions = await app.inject({
      method: 'GET',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/contributions.csv`,
    });
    expect(contributions.statusCode).toBe(200);
    expect(contributions.body).toContain(SMALL_A);
  });

  it('returns 404 for an unknown round', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/rounds/0x9999999999999999999999999999999999999999/results',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'round_not_found' } });
  });

  it('validates query parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/projects?limit=0`,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'validation_error' } });
  });

  it('protects admin routes with the API key', async () => {
    const unauthorized = await app.inject({ method: 'GET', url: '/api/v1/admin/status' });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toMatchObject({ error: { code: 'unauthorized' } });

    const authorized = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/status',
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toMatchObject({ data: { chainId: 11155111 } });
  });

  it('imports eligibility, proves membership, and builds contribute calldata', async () => {
    const importResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/rounds/${ROUND_ADDRESS}/eligibility/import`,
      headers: { 'x-admin-key': ADMIN_KEY },
      payload: {
        source: 'unit-test',
        addresses: [{ address: SMALL_A, label: 'Asha' }, { address: SMALL_B }],
      },
    });
    expect(importResponse.statusCode).toBe(200);
    const imported = importResponse.json() as {
      data: { root: string; leafCount: number; transaction: { data: string } };
    };
    expect(imported.data.leafCount).toBe(2);
    expect(imported.data.root).toMatch(/^0x[0-9a-f]{64}$/);

    const unpublished = await app.inject({
      method: 'POST',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/contribute/calldata`,
      payload: { address: SMALL_A, projectId: 0, amountWei: ONE_ETH.toString() },
    });
    expect(unpublished.statusCode).toBe(409);
    expect(unpublished.json()).toMatchObject({
      error: { code: 'eligibility_root_not_published' },
    });

    // Simulate the operator publishing the root and the indexer observing it.
    db.prepare('UPDATE rounds SET eligibility_root = ? WHERE id = 1').run(imported.data.root);

    const proofResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/eligibility/proof`,
      payload: { address: SMALL_A },
    });
    expect(proofResponse.statusCode).toBe(200);
    const proof = proofResponse.json() as {
      data: { eligible: boolean; proof: string[]; root: string; leaf: string };
    };
    expect(proof.data.eligible).toBe(true);
    expect(proof.data.proof.length).toBeGreaterThan(0);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/eligibility/verify`,
      payload: { address: SMALL_A, proof: proof.data.proof },
    });
    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.json()).toMatchObject({ data: { valid: true } });

    const calldataResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/contribute/calldata`,
      payload: { address: SMALL_A, projectId: 0, amountWei: ONE_ETH.toString() },
    });
    expect(calldataResponse.statusCode).toBe(200);
    const calldata = calldataResponse.json() as {
      data: { eligible: boolean; transaction: { to: string; value: string; data: string } };
    };
    expect(calldata.data.eligible).toBe(true);
    expect(calldata.data.transaction.to).toBe(ROUND_ADDRESS);
    expect(calldata.data.transaction.value).toBe(ONE_ETH.toString());

    const decoded = decodeFunctionData({
      abi: qfAbi,
      data: calldata.data.transaction.data as `0x${string}`,
    });
    expect(decoded.functionName).toBe('contribute');
    expect(decoded.args?.[0]).toBe(0n);
    expect(decoded.args?.[1]).toEqual(proof.data.proof);
  });

  it('reports ineligible addresses without building a transaction', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/rounds/${ROUND_ADDRESS}/contribute/calldata`,
      payload: {
        address: '0x9999999999999999999999999999999999999999',
        projectId: 0,
        amountWei: '1',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: { eligible: false, transaction: null },
    });
  });

  it('keeps the seeded project shape consistent with fixtures', () => {
    const project = makeProject(0);
    expect(project.payout).toBe(PAYOUT_0);
  });
});
