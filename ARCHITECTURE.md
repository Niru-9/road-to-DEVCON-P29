# Architecture

## System shape

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ Sepolia                      │        │ Backend (Node 20+)           │
│                              │        │                              │
│ QuadraticFundingRound.sol    │◀──RPC──│ viem PublicClient (read-only)│
│  • Merkle eligibility        │        │        │                     │
│  • (Σ√c)² scores             │        │        ▼                     │
│  • pool-scaled matches       │        │ Event indexer                │
│  • one-time withdrawals      │        │        │                     │
└──────────────────────────────┘        │        ▼                     │
             ▲                          │ SQLite (event-sourced cache) │
             │ unsigned tx              │        │                     │
             │                          │        ▼                     │
      ┌──────┴───────┐                  │ Results + eligibility engine │
      │ Operator /   │                  │        │                     │
      │ project lead │                  │        ▼                     │
      │ wallet/Remix │                  │ Fastify HTTP API             │
      └──────────────┘                  └──────────────────────────────┘
```

The backend never signs and never stores keys. It reads chain data, proves
membership, builds unsigned transactions, and exposes a recomputable result.

## Components

### 1. Round contract

`contracts/src/QuadraticFundingRound.sol`

- `Ownable2Step` for a two-step operator handover.
- `ReentrancyGuard` on `contribute`, `finalize`, `withdraw`, and dust reclaim.
- Eligibility: `eligibilityLeaf(address) = keccak256(abi.encode(address))`,
  verified with OpenZeppelin `MerkleProof` (sorted pairs).
- Contributions are aggregated per `(projectId, contributor)`, so splitting a
  payment across transactions cannot inflate the score.
- `finalize()` is permissionless after `endTime`, computes all scores, then uses
  `Math.mulDiv(score, pool, totalScore)` to floor-scale matches.
- `withdraw(projectId)` is payout-only, once, and follows checks-effects-interactions.
- `reclaimUnallocatedPool()` lets the operator recover rounding dust after
  finalization. Contributions and allocated matches are never touched.
- Direct ETH transfers revert; ETH enters only through `contribute` or `fundPool`.

### 2. Chain reader

`backend/src/chain/reader.ts`

- Creates a viem `PublicClient` for Sepolia or any configured EVM chain.
- Reads round aggregates, project rows, scores, and native balance.
- Used by round bootstrap, refresh, reconcile, and the balance check in results.

### 3. Event indexer

`backend/src/chain/indexer.ts`

- Polls `getLogs` in configurable block batches, waiting for confirmations.
- Decodes `ProjectRegistered`, `Contribution`, `MatchFinalized`,
  `RoundFinalized`, `Withdrawal`, `EligibilityRootUpdated`, `PoolFunded`, and
  `UnallocatedPoolReclaimed`.
- Writes events and derived totals in one SQLite transaction per batch.
- Is idempotent: contributions are unique on `(round_id, tx_hash, log_index)`;
  projects and matches upsert.
- Refreshes aggregate accounting fields from contract reads after each batch,
  which repairs any missed aggregate event and catches manual state changes.
- Records every pass in `sync_runs` for observability. A failed batch marks the
  run as `error` and leaves `last_indexed_block` at the previous successful batch.

### 4. Eligibility service

`backend/src/services/merkle.ts` and `eligibility.ts`

- Deduplicates addresses case-insensitively, preserving first-seen order.
- Sorts leaves and hashes pairs in sorted order, matching `MerkleProof.verify`.
- Stores the imported set and root history; only the newest set is active.
- Generates proofs on demand and verifies every generated proof locally before
  returning it.
- Returns `rootMatchesOnchain`. `POST /contribute/calldata` refuses to build a
  transaction while the local root differs from the on-chain root, so a
  contributor cannot waste gas on a proof that will revert.

### 5. Results engine

`backend/src/services/results.ts`

Input: round row, project rows, raw contribution rows, and (after finalization)
on-chain match rows.

1. Group contributions by `(project, contributor)` and sum each contributor's
   amount.
2. `sumSqrt(project) = Σ isqrt(contributorTotal)`, `score = sumSqrt²`.
3. `totalScore = Σ score`.
4. `match = floor(score × pool ÷ totalScore)`.
5. If the round is finalized, compare every recomputed score/match and the total
   score with the on-chain rows, and report `matchSource: "onchain"`.

The engine emits an `integrity` block:

| Check | Meaning |
| --- | --- |
| `indexMatchesProjectTotals` | Cached project totals equal raw event replay |
| `indexMatchesRoundTotal` | Cached round total equals raw event replay |
| `scoresMatchOnchain` | Recomputed scores equal `MatchFinalized` scores |
| `matchesMatchOnchain` | Recomputed matches equal `MatchFinalized` matches |
| `totalScoreMatchesOnchain` | Recomputed total equals `totalScore()` |
| `totalMatchesWithinPool` | `Σ match ≤ matchingPool` |
| `noOrphanContributions` | Every contribution references a registered project |
| `balanceCoversOutstanding` | Contract balance covers unwithdrawn payouts (when requested) |

`ok` is the conjunction of every non-null check. Warnings explain failures in
plain language.

### 6. HTTP API

`backend/src/app.ts` wires:

- Fastify 5 with the Zod type provider (request validation + OpenAPI generation)
- CORS (configurable origins)
- Global rate limiting (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW`)
- Swagger UI at `/docs`
- Structured error responses
- Public routes under `/api/v1` and operator routes under `/api/v1/admin`

Plugins in `backend/src/routes/` are thin: resolve the round, call a service,
format the response. Business logic lives in `services/`.

## Data model

SQLite (`backend/src/db/schema.ts`):

- `rounds` — one row per `(chain_id, address)`, cached aggregates, indexer cursor.
- `projects` — one row per `(round_id, onchain_project_id)`, cached totals,
  withdrawal state.
- `contributions` — immutable event log, unique on `(round_id, tx_hash, log_index)`.
- `matches` — final on-chain match per project.
- `eligibility_entries` — the active imported attendee set.
- `eligibility_roots` — append-only root history with an `active` flag.
- `sync_runs` — indexer audit trail.

All wei values are decimal `TEXT`; all arithmetic is `BigInt`. Scores can exceed
SQLite's signed 64-bit integer range, and JS `number` cannot represent wei
exactly, so neither is used for money.

## Round lifecycle

| Phase | Backend phase | Contract capability |
| --- | --- | --- |
| Before `startTime` | `scheduled` | Operator registers projects, funds pool, sets root |
| `startTime` … `endTime` | `open` | Eligible addresses contribute |
| After `endTime`, not finalized | `awaiting-finalization` | Anyone calls `finalize()` |
| `finalized = true` | `finalized` | Payouts withdraw once; operator reclaims dust |

Results before finalization are explicitly marked `matchSource: "computed"` and
carry warnings that they are previews.

## Failure modes and recovery

| Failure | Behaviour |
| --- | --- |
| Public RPC hiccup | Indexer batch fails, sync run records the error, cursor does not advance past the failed batch; next poll retries |
| Missed aggregate event | Post-batch chain refresh repairs aggregates from contract views |
| Reorg within confirmations | Not indexed until `INDEXER_CONFIRMATIONS` blocks pass |
| Project event seen before registration | Placeholder project row is created with a warning, then repaired by `ProjectRegistered` or reconcile |
| Local cache drift | `POST /admin/rounds/:address/reconcile` reports diffs; `repair: true` rewrites project rows from chain |
| Local eligibility root not published | Proof endpoint warns; contribute calldata returns `409 eligibility_root_not_published` |
| Indexer disabled | API still reads the last indexed state; `POST /admin/.../sync` can run one pass |

## Runtime and deployment

The API is a single stateless process apart from its SQLite file. The container
image compiles TypeScript in a build stage, prunes dev dependencies, then runs
`node dist/index.js` as the unprivileged `node` user.

`docker-compose.yml`:

- mounts the named volume `qf-round-data` at `/app/data` (SQLite plus WAL files),
- reads optional overrides from `backend/.env`,
- exposes port `3001`,
- healthchecks `GET /health` every 30 seconds.

Operator commands use the `:built` scripts (`sync:built`, `verify:built`,
`round:add:built`, `eligibility:import:built`) so the runtime image does not need
`tsx`. Contract deployment is still manual from Remix; the backend never signs.

## Non-goals for this milestone

- No frontend, notifications, or user accounts.
- No transaction signing, key management, or custody.
- No multi-instance SQLite coordination.
- No automatic contract deployment; the operator deploys from Remix.
- No anti-Sybil proof beyond the operator-curated attendee Merkle tree.
