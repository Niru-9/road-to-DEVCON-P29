# HTTP API

Base URL: `http://localhost:3001`. Versioned routes live under `/api/v1`.
Interactive OpenAPI documentation: `/docs`.

All responses are JSON unless a CSV endpoint is used. Big integers are decimal
strings (`"1000000000000000000"`). ETH-formatted values are display strings.

## Errors

```json
{
  "error": {
    "code": "round_not_found",
    "message": "Round 0x… is not indexed on chain 11155111. Add it with POST /api/v1/admin/rounds.",
    "details": {}
  }
}
```

Validation errors use `code: "validation_error"` and a `details` array of
`{ path, message, code }`.

Common status codes: `400` invalid input, `401` missing/bad admin key,
`403` forbidden, `404` unknown round/project/root, `409` conflicting state
(unpublished eligibility root), `502` RPC read failed, `503` admin disabled or
chain not ready.

## Authentication

- Public routes: no authentication.
- `/api/v1/admin/*`: requires `x-admin-key: <ADMIN_API_KEY>`. If
  `ADMIN_API_KEY` is unset, every admin route returns `503 admin_disabled`.
  The key is never returned or stored in the database.

## Health

### `GET /`
Service metadata.

### `GET /health`
Liveness, database status, indexer status, indexed round count.

### `GET /health/ready`
Database ping plus a 5-second RPC `eth_blockNumber`. Returns `503` if the chain
read fails.

---

## Rounds

### `GET /api/v1/rounds`
Lists rounds for the configured chain, newest first.

```json
{
  "data": [
    {
      "address": "0x…",
      "chainId": 11155111,
      "name": "Road to Devcon Quadratic Round",
      "phase": "open",
      "matchingPoolWei": "10000000000000000000",
      "matchingPoolEth": "10",
      "totalContributionsWei": "2000000000000000000",
      "totalScore": "400000000000000000000",
      "projectCount": 12,
      "indexer": {
        "startBlock": 1234567,
        "lastIndexedBlock": 1234999,
        "latestRun": { "status": "success", "fromBlock": 1234900, "toBlock": 1234999 }
      }
    }
  ],
  "meta": { "count": 1, "chainId": 11155111 }
}
```

### `GET /api/v1/rounds/:address`
Round summary for one address.

### `GET /api/v1/rounds/:address/projects?limit=50&offset=0`
Paginated projects. `limit` is 1–200.

```json
{
  "data": [
    {
      "onchainId": 0,
      "payout": "0x…",
      "name": "Tamil and Kannada wallet docs",
      "metadataUri": "ipfs://…",
      "contributionsWei": "2000000000000000000",
      "contributionsEth": "2",
      "matchWei": "80000000000000000000",
      "matchEth": "80",
      "scoreWei": "400000000000000000000",
      "withdrawn": false
    }
  ],
  "meta": { "total": 12, "limit": 50, "offset": 0, "round": "0x…" }
}
```

### `GET /api/v1/rounds/:address/projects/:projectId`
Full project result, including every contributor's aggregated amount, square
root, score share, integrity summary, formula notes, and a `withdrawTransaction`
when the project is finalized, unwithdrawn, and has a non-zero payout.

### `GET /api/v1/rounds/:address/contributions?limit=50&offset=0&projectId=0&contributor=0x…`
Paginated raw `Contribution` events, newest first.

### `GET /api/v1/rounds/:address/stats`
Round summary plus a top-20 leaderboard by total payout.

---

## Results

### `GET /api/v1/rounds/:address/results?includeBalance=true`
The complete recomputed result. `includeBalance=true` adds a live contract
balance check (slower; one RPC call).

```json
{
  "data": {
    "round": {
      "address": "0x…",
      "phase": "finalized",
      "finalized": true,
      "matchingPoolWei": "100000000000000000000",
      "totalContributionsWei": "102000000000000000000",
      "totalScoreWei": "500000000000000000000",
      "totalMatchAllocatedWei": "100000000000000000000",
      "unallocatedPoolWei": "0",
      "totalPayoutsWei": "202000000000000000000",
      "outstandingPayoutsWei": "202000000000000000000",
      "uniqueContributors": 201,
      "onchainBalanceWei": "202000000000000000000"
    },
    "projects": [
      {
        "onchainId": 0,
        "name": "Community translations",
        "contributionsWei": "2000000000000000000",
        "sumSqrtWei": "20000000000",
        "scoreWei": "400000000000000000000",
        "matchWei": "80000000000000000000",
        "matchSource": "onchain",
        "totalPayoutWei": "82000000000000000000",
        "uniqueContributors": 200,
        "contributors": [
          {
            "address": "0x…",
            "amountWei": "10000000000000000",
            "amountEth": "0.01",
            "sqrtWei": "100000000",
            "scoreShareBps": 50
          }
        ]
      }
    ],
    "integrity": {
      "ok": true,
      "checks": {
        "indexMatchesProjectTotals": true,
        "indexMatchesRoundTotal": true,
        "scoresMatchOnchain": true,
        "matchesMatchOnchain": true,
        "totalScoreMatchesOnchain": true,
        "totalMatchesWithinPool": true,
        "noOrphanContributions": true,
        "balanceCoversOutstanding": true
      },
      "warnings": [],
      "checkedAt": "2026-10-29T08:00:00.000Z"
    },
    "formula": {
      "score": "score(project) = (Σ sqrt(contributorTotal))², using floor integer square roots in wei",
      "match": "match(project) = floor(score(project) × matchingPool ÷ Σ score(all projects))",
      "notes": ["…"]
    },
    "generatedAt": "2026-10-29T08:00:00.000Z"
  },
  "meta": { "source": "event-replay", "chainBalanceIncluded": true }
}
```

`matchSource` is `"computed"` before finalization and `"onchain"` afterward.
Pre-finalization results carry warnings saying they are previews.

### `GET /api/v1/rounds/:address/results/summary`
Compact per-project results without contributor breakdowns.

### `GET /api/v1/rounds/:address/results/verify`
Round totals, formula, and the integrity report. This is the endpoint a project
lead can call to see why a result is (or is not) trustworthy.

### `GET /api/v1/rounds/:address/results.csv`
CSV export of project results.

### `GET /api/v1/rounds/:address/contributions.csv`
CSV export of raw contribution events.

---

## Eligibility

### `GET /api/v1/rounds/:address/eligibility/root`
Active local root, on-chain root, whether they match, address count, and root
history.

### `POST /api/v1/rounds/:address/eligibility/proof`

```json
{ "address": "0xabc…" }
```

Response:

```json
{
  "data": {
    "address": "0xabc…",
    "eligible": true,
    "root": "0x…",
    "leaf": "0x…",
    "proof": ["0x…", "0x…"],
    "leafCount": 200,
    "onchainRoot": "0x…",
    "rootMatchesOnchain": true,
    "warnings": []
  }
}
```

Non-members return `eligible: false` with an empty proof. Proofs are verified
locally before being returned.

### `POST /api/v1/rounds/:address/eligibility/verify`

```json
{
  "address": "0xabc…",
  "proof": ["0x…", "0x…"],
  "root": "0x…"
}
```

`root` is optional; otherwise the on-chain root is used, falling back to the
active local root. The response includes `valid`, `rootSource`, and the leaf.

### `POST /api/v1/rounds/:address/contribute/calldata`

```json
{
  "address": "0xabc…",
  "projectId": 0,
  "amountWei": "10000000000000000"
}
```

Success:

```json
{
  "data": {
    "eligible": true,
    "address": "0xabc…",
    "transaction": {
      "chainId": 11155111,
      "to": "0x…",
      "data": "0x…",
      "value": "10000000000000000",
      "description": "Contribute to project 0. Must be signed by the eligible contributor.",
      "submittedBy": "anyone"
    },
    "warnings": []
  }
}
```

If the address is not in the tree: `{ eligible: false, transaction: null }` with
HTTP 200. If the local root has not been published on-chain: HTTP `409`
`eligibility_root_not_published`, with `localRoot` and `onchainRoot` details.

---

## Admin

All admin routes require `x-admin-key`.

### `GET /api/v1/admin/status`
Chain id, indexer status, and row counts.

### `POST /api/v1/admin/rounds`

```json
{ "address": "0x…", "name": "Road to Devcon Round", "startBlock": 1234567 }
```

Reads the contract's views to validate the address and seed aggregates. Returns
`warnings` if no start block was supplied (genesis scans are slow).

### `POST /api/v1/admin/rounds/:address/refresh`
Re-reads round aggregates from chain.

### `POST /api/v1/admin/rounds/:address/sync`
Runs one indexer pass for this round and returns the sync result.

### `POST /api/v1/admin/rounds/:address/reconcile`

```json
{ "repair": false }
```

Compares indexed projects and aggregates against chain reads. Returns `diffs`.
`repair: true` rewrites project rows and round aggregates from chain state.

### `GET /api/v1/admin/rounds/:address/eligibility`
Eligibility summary **including every address** in the active set.

### `POST /api/v1/admin/rounds/:address/eligibility/import`
Accepts either a JSON address list or a raw CSV string.

```json
{
  "source": "road-to-devcon-attendees",
  "addresses": [
    { "address": "0x…", "label": "Asha" },
    { "address": "0x…" }
  ]
}
```

```json
{
  "source": "csv-upload",
  "csv": "address,label\n0x…,Asha\n0x…,Bob\n"
}
```

Returns the new root, leaf count, duplicates, warnings, a summary, and an
unsigned `setEligibilityRoot` transaction.

CSV headers are optional and case-insensitive. Recognized address headers:
`address`, `wallet`, `wallet_address`, `addr`, `account`. Optional `label`/`name`
and `source` columns are supported. Invalid addresses reject the whole import
with line numbers.

### `POST /api/v1/admin/rounds/:address/eligibility/calldata`
Unsigned `setEligibilityRoot` transaction for the active local root.

### `POST /api/v1/admin/rounds/:address/projects/calldata`

```json
{
  "payout": "0x…",
  "name": "Marathi Solidity video series",
  "metadataUri": "ipfs://…"
}
```

Unsigned `registerProject` transaction.

### `POST /api/v1/admin/rounds/:address/fund-pool/calldata`

```json
{ "amountWei": "5000000000000000000" }
```

Unsigned `fundPool` transaction with `value`.

### `POST /api/v1/admin/rounds/:address/finalize/calldata`
Unsigned `finalize()` transaction. The contract function is permissionless; this
helper is admin-protected only to keep the surface small.

### `POST /api/v1/admin/rounds/:address/projects/:projectId/withdraw/calldata`
Unsigned `withdraw(projectId)` transaction plus the expected payout address.

### `POST /api/v1/admin/rounds/:address/reclaim/calldata`
Unsigned `reclaimUnallocatedPool()` transaction for post-finalization dust.

---

## CLI equivalents

```bash
npm run migrate
npm run round:add -- 0xRound --start-block 1234567 --name "Round name"
npm run eligibility:import -- 0xRound --file ../fixtures/eligibility.example.csv
npm run sync -- 0xRound            # or --watch
npm run verify -- 0xRound          # add --no-chain for offline replay, --repair to fix
```
