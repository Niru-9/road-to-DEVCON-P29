# Two Hundred Small Backers Should Beat One Whale

A complete backend for a quadratic-funding round: an on-chain round contract, an
event indexer, on-chain eligibility proofs, unsigned transaction builders, and a
results engine that anyone can re-run to check the math.

**Status:** the contract is deployed on Sepolia at
`0x634740A6D3334e23c24B22F73C01e69431d8310F` (block `12024921`), recorded in
[`deployments/sepolia.json`](deployments/sepolia.json), the backend passes its
test suite, and the complete Web3 frontend dApp is deployed in [`frontend/`](frontend/).
Publishing the eligibility root, registering projects, and funding the
pool are the remaining operator steps; see [`action.md`](action.md).

---

## What this solves

Arjun has a sponsor matching pool and about a dozen grassroots projects. He wants
breadth of support to matter more than one large cheque, contributors to come
from the verified Road to Devcon attendee list, and every project lead to be able
to verify their own result.

The round contract implements:

```
score(project) = (Σ sqrt(contributorTotal))²
match(project) = floor(score(project) × matchingPool ÷ Σ score(all projects))
payout(project) = contributions(project) + match(project)
```

All arithmetic is integer-only. Square roots and pool scaling are floored exactly
as the EVM does it, so the backend reproduces on-chain results bit-for-bit.

A worked example used in the tests: 200 people contribute `0.01 ETH` each
(`2 ETH` total) to one project, while a whale contributes `100 ETH` to another.
The crowd scores `4×10²⁰`, the whale scores `1×10²⁰`, and an `100 ETH` pool pays
`80 ETH` to the crowd and `20 ETH` to the whale. **Breadth wins 4:1.**

---

## Repository layout

```
frontend/
  src/                               Vite + React 18 + Viem + Tailwind dApp
  src/pages/                         Explore, Results engine, Attendee pass, Withdraw, Operator
contracts/
  src/QuadraticFundingRound.sol      Core round contract (OpenZeppelin 5.6)
  test/QuadraticFundingRound.t.sol   Foundry acceptance + security tests
  remix/QuadraticFundingRound.sol    Single-file flatten for Remix deployment
backend/
  src/                               Fastify + viem + SQLite API/indexer
  test/                              Vitest unit + HTTP integration tests
fixtures/                            Example eligibility and project files
deployments/                         Sepolia address + deployment metadata
docs/                                API, Remix deployment, test-case evidence
scripts/flatten.mjs                  Dependency-free Solidity flattener
docker-compose.yml                   Single-service backend + persistent SQLite volume
```

---

## Quick start

Prerequisites: Node.js 20.12+ (22 LTS recommended), npm, and a browser wallet for
the eventual Remix deployment.

```bash
# 1. Install contract tooling and backend dependencies
npm install
cd backend && npm install && cd ..

# 2. Compile the contract with solc (no Foundry binary required)
npm run compile:solc

# 3. Build the Remix single-file contract
npm run flatten:remix

# 4. Backend checks
cd backend
npm run typecheck
npm test
npm run build
cd ..

# 5. Start the frontend dApp
cd frontend
npm install
npm run dev
```

Start the API:

```bash
cd backend
cp .env.example .env       # then edit DATABASE_PATH, ROUND_ADDRESS, ADMIN_API_KEY
npm run migrate
npm run dev
```

Open `http://localhost:3001/docs` for Swagger UI.

### Run with Docker

```bash
cp backend/.env.example backend/.env   # fill ROUND_ADDRESS, ADMIN_API_KEY, ...
docker compose up --build -d
docker compose logs -f backend
```

The SQLite database is kept in the named volume `qf-round-data`, so restarts and
image rebuilds do not lose indexed data. The container runs `node dist/index.js`
and has a `/health` healthcheck.

Operator CLI commands run inside the container with the built entrypoints:

```bash
docker compose exec backend npm run round:add:built -- 0xRound --start-block 1234567
docker compose exec backend npm run eligibility:import:built -- 0xRound --file /app/fixtures/eligibility.example.csv
docker compose exec backend npm run sync:built -- 0xRound
docker compose exec backend npm run verify:built -- 0xRound
```

Mount `fixtures/` into the container (for example
`-v ./fixtures:/app/fixtures:ro`) if you want to import local CSVs. Compose
`env_file.required: false` needs Docker Compose v2.24 or newer; on older versions
delete the `env_file` block and use `environment:` values instead.

---

## End-to-end operator workflow

Each step is explained in detail in [`docs/REMIX_DEPLOY.md`](docs/REMIX_DEPLOY.md).

1. **Deploy** `contracts/remix/QuadraticFundingRound.sol` from Remix to Sepolia.
   Constructor: `(initialOwner, initialEligibilityRoot, startTime, endTime)`.
   Send the initial matching pool as `value`; use `bytes32(0)` for the root if
   eligibility will be imported later.
2. **Record the deployment** in `deployments/sepolia.json` and in `backend/.env`:
   `ROUND_ADDRESS` and `ROUND_START_BLOCK` (the deployment block).
3. **Add / verify the round**:
   `npm run round:add -- 0xYourRound --start-block 1234567`
4. **Import eligibility** from the attendee CSV:
   `npm run eligibility:import -- 0xYourRound --file ../fixtures/eligibility.example.csv`
   This prints `setEligibilityRoot` calldata. Submit it from the operator wallet,
   then run `npm run sync`.
5. **Register projects and fund the pool** via the admin calldata endpoints, or
   directly from Remix as the operator.
6. **Community contributes** through `POST /api/v1/rounds/:address/contribute/calldata`.
   The returned `{ to, data, value }` is ready for a wallet or Remix.
7. **After `endTime`**, anyone calls `finalize()`. Use
   `POST /api/v1/admin/rounds/:address/finalize/calldata` (the endpoint is admin
   protected only to prevent abuse of the helper; the transaction itself is
   permissionless).
8. **Projects withdraw once** using
   `POST /api/v1/admin/rounds/:address/projects/:id/withdraw/calldata` from the
   project payout address.
9. **Publish results**: `GET /api/v1/rounds/:address/results`,
   `GET .../results.csv`, and `GET .../results/verify`. A skeptical project lead
   can recompute every score from the public `Contribution` events.

---

## Why the important checks hold

| Requirement | Where it is enforced |
| --- | --- |
| Score is `(Σ√c)²` before pool division | `QuadraticFundingRound._computeScore`, `backend/src/services/results.ts` |
| Matches never exceed the pool | `Math.mulDiv` floor scaling + `allocated > pool` invariant + dust reclaim |
| Eligibility is checked in the contract | Merkle proof in `contribute`, leaf `keccak256(abi.encode(address))` |
| One withdrawal per project | `already-withdrawn` check, effects before transfer, `nonReentrant` |
| Contribution events carry the contributor | `event Contribution(projectId, contributor, amount, contributorTotal)` |
| No finalize before the round ends | `block.timestamp <= endTime` revert in `finalize` |
| No contributions after the round ends | `block.timestamp > endTime` revert in `contribute` |
| Only the operator registers projects | `onlyOwner` on `registerProject` |
| Sepolia address recorded | `deployments/sepolia.json` (deployed and verified on-chain) |
| No credentials in tracked files | `.gitignore`, env-only admin key, no private keys anywhere |

A point-by-point mapping to all 10 scored test cases is in
[`docs/TEST_CASES.md`](docs/TEST_CASES.md).

---

## Backend in one minute

- **Read-only chain access.** The process uses a `PublicClient`; it never holds a
  private key and never signs. Admin calldata endpoints return unsigned
  transactions for a wallet to submit.
- **Event-sourced index.** SQLite stores rounds, projects, contributions,
  on-chain matches, eligibility sets, and sync runs. Re-indexing is idempotent
  on `(tx_hash, log_index)`.
- **Independent results engine.** `/results` replays raw contributions and
  recomputes scores and matches instead of trusting cached totals. It also
  cross-checks its output against `MatchFinalized` / `RoundFinalized` events and
  the contract's aggregate views.
- **Big integers everywhere.** Token amounts and scores are stored as decimal
  `TEXT` and manipulated as JavaScript `BigInt`; SQLite `SUM()` is never used for
  money.
- **Operator API.** Disabled unless `ADMIN_API_KEY` is set. The key is read from
  the environment only.

Configuration reference: [`backend/.env.example`](backend/.env.example).

---

## API surface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health`, `/health/ready` | Liveness / database + RPC readiness |
| GET | `/api/v1/rounds` | Indexed rounds |
| GET | `/api/v1/rounds/:address` | Round summary + indexer status |
| GET | `/api/v1/rounds/:address/projects` | Paginated projects |
| GET | `/api/v1/rounds/:address/projects/:id` | Project result + withdraw calldata |
| GET | `/api/v1/rounds/:address/contributions` | Paginated raw contributions |
| GET | `/api/v1/rounds/:address/stats` | Top-20 leaderboard |
| GET | `/api/v1/rounds/:address/results` | Full recomputed results + integrity checks |
| GET | `/api/v1/rounds/:address/results/summary` | Compact results |
| GET | `/api/v1/rounds/:address/results/verify` | Formula + integrity report |
| GET | `/api/v1/rounds/:address/results.csv` | Results export |
| GET | `/api/v1/rounds/:address/contributions.csv` | Contribution export |
| GET | `/api/v1/rounds/:address/eligibility/root` | Active root + history |
| POST | `/api/v1/rounds/:address/eligibility/proof` | Merkle proof for an address |
| POST | `/api/v1/rounds/:address/eligibility/verify` | Independently verify a proof |
| POST | `/api/v1/rounds/:address/contribute/calldata` | Unsigned `contribute` transaction |
| * | `/api/v1/admin/*` | Operator import/sync/reconcile/calldata helpers |

Full request/response documentation with examples is in [`docs/API.md`](docs/API.md).

---

## Tests

```bash
cd backend
npm test             # 40 tests: integer math, Merkle, QF results, CSV, HTTP API
npm run typecheck
```

Contract:

```bash
# With Foundry installed (add %USERPROFILE%\.foundry\bin to PATH on Windows):
forge test -vvv      # 21 passed, 0 failed at last run
```

Foundry is configured in `foundry.toml`. A small vendored `ds-test` shim at
`contracts/lib/ds-test/src/test.sol` is required because the pinned
`forge-std@1.1.2` does not ship `ds-test/test.sol`. The flattened Remix file is
also compiled independently via `npm run compile:solc`.

The Foundry suite covers both acceptance and adversarial cases: score math,
pool scaling, Merkle eligibility, self-contribution, duplicate payouts, round
windows, double withdrawal, unauthorized registration, and reentrancy.

---

## Deliberate limitations (MVP)

- The round operator is trusted to publish the attendee list and can update the
  root until the round ends. Contributions already made cannot be erased, but a
  malicious operator could block new contributors. This is documented in
  [`SECURITY.md`](SECURITY.md).
- The frontend dApp is fully functional in `frontend/` and connects directly
  to Sepolia via viem and browser wallets, with live quadratic calculation and Merkle proof generation.
- SQLite is single-writer and intended for one backend instance. It is
  sufficient for a single round and trivial to replace with Postgres later.
- No automated contract deployment, no private keys, no signing service.
- Results before `finalize()` are previews and are labelled as such.
