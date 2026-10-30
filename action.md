# Action Report — Quadratic Funding Round (Problem 2)

**Date:** 2026-10-30
**Scope:** Solidity contract + backend services only. No frontend, no automated
deployment, no GitHub push.
**Deployment status:** **DEPLOYED on Sepolia and verified on-chain.**
`0x634740A6D3334e23c24B22F73C01e69431d8310F`, block `12024921`, tx
`0x9920560939f964b6f4ecb6e39e5d7b146eb645528e2f252645959ed689cb5b9c`.
Operator/owner: `0x0d3477209913afFAF06CDe63Dd0F13f4C5728135`.
Round configuration: **COMPLETE** — eligibility root, two projects, and a
matching pool are live (see §0). Contributions are open until 2026-11-06.

---

## 0. Round configuration pass (2026-10-30, later)

The four operator calls were submitted from the owner wallet and confirmed. Every
value below was read directly from Sepolia at block `12027466`.

| Action | Transaction | Block |
| --- | --- | --- |
| `setEligibilityRoot(0x8cb9…)` | `0xf99b3637eb7c14475863eec61ff0ce21d8c9abf5c58ba5134799acf4d697d44f` | `12027441` |
| `registerProject` id `0` | `0x5a542b6458758bf083b8513678eccc620e121d744d6c0e3da1dad9d8c902f1de` | `12027454` |
| `registerProject` id `1` | `0xbd724ec13a17a65866d27f29211470c40a3cd82b667607ec87abba454e9f5821` | `12027457` |
| `fundPool()` | `0x3c223269732d48223a240aed9edf121817c1889d1234748f93f0d473b6a72db9` | `12027461` |

### Current on-chain state

| Field | Value |
| --- | --- |
| `eligibilityRoot` | `0x8cb9e2e36fe9067175bda04ac3c341bbd275bd315a2380a3aab07c152a60cfbc` |
| `projectCount` | `2` |
| `matchingPool` | `100000` wei (`0.0000000000001 ETH`) |
| `totalContributions` | `0` |
| `totalScore` / `totalMatchAllocated` | `0` / `0` |
| `finalized` | `false` |
| Contract balance | `100000` wei |

**Projects (registration order = project id):**

| id | payout | name | metadataURI |
| --- | --- | --- | --- |
| 0 | `0xF859C8B7462a9e30Ee4ec627ca2cAab1b1a04DF7` | Tamil and Kannada wallet-docs translations | `'' ''` |
| 1 | `0xBc86656811F5D6e90AACE15B1cd9267658290a8D` | Marathi Solidity video series | `'' ''` |

**Allowlist (3 leaves):** operator `0x0d34…` plus both payout wallets. The Merkle
proofs for all three were verified with `isEligible` against the deployed
bytecode on a local chain (`true` for each) before the root was published.

### Two data notes

- **`metadataURI` is the literal 5-byte string `'' ''`** (`0x2727202727`) on both
  projects — the empty string was entered as `'' ''` in Remix. It is valid and
  harmless, but immutable for these project ids. A new metadata value would
  require registering a new project.
- **The matching pool is `100000` wei, not `0.01 ETH`.** It is non-zero, so
  contributions work, but it is economically negligible. `fundPool` is additive:
  call it again from the operator wallet before `endTime` to top the pool up. No
  redeploy is needed.

### Files added/changed for this pass

| File | Change |
| --- | --- |
| `fixtures/eligibility.local.csv` | **Added** — 3-address bootstrap allowlist (operator + both payouts). |
| `fixtures/projects.local.json` | **Added** — the two projects with the supplied payout addresses. |
| `backend/scripts/configure-round.mjs` | **Added** — one-command runner for root/projects/pool; dry-run mode; prints proofs. |
| `backend/package.json` | Added `configure:round` npm script. |
| `backend/data/qf.db` | Synced the four configuration events; `verify` and `reconcile` pass. |
| `deployments/sepolia.json` | Added `configuration`, `projects`, `verifiedAtBlock`, `configuredAt`; status now `configured-awaiting-contributions`. |
| `README.md` | Status now points at the live Sepolia address and `action.md`. |
| `fixtures/README.md` | Documented the two new local fixture files. |

### Backend indexer

`npm run sync -- 0x6347…` replayed the four configuration events
(`logsProcessed: 4`). `npm run verify -- 0x6347…` now reports
`integrity.ok = true` and `reconcile.ok = true`, with `2` projects indexed and
`matchingPoolWei = 100000`. The only warning is the expected
"The round is not finalized; match amounts are previews, not claims."

---

## 1. What was done in the initial pass

1. Verified the actual contract source and backend source (not the prior report).
2. Fixed the Foundry test harness, which was red for reasons unrelated to the
   contract:
   - Contributors/operator had no ETH, so payable calls reverted with empty data.
   - `vm.prank` was consumed by the `_proof(...)` static calls evaluated inside
     the `contribute` argument list, so `contribute` ran as the test contract and
     returned `NotEligible`.
   - The reentrancy test pointed at project id `1` while registering the attacker
     as project `0`.
3. Added the missing `ds-test` shim and remapping so the pinned
   `forge-std@1.1.2` works with this Foundry install.
4. Re-ran the full contract suite, the solc compile, the Remix flatten, and the
   backend typecheck + test suite.
5. Corrected documentation that claimed the Foundry suite could not be run.
6. Confirmed no private keys, mnemonics, or fake deployment addresses exist.
7. Verified the operator's Sepolia deployment directly via RPC and recorded the
   real address, block, tx, owner, and constructor values in
   `deployments/sepolia.json`.

---

## 2. Files changed in the initial pass

| File | Change |
| --- | --- |
| `contracts/test/QuadraticFundingRound.t.sol` | Fund actors in `setUp`; build Merkle proofs before `vm.prank`; fix reentrancy test project id. |
| `contracts/lib/ds-test/src/test.sol` | **Added** vendored `DSTest` shim (missing from `forge-std@1.1.2`). |
| `foundry.toml` | Added `ds-test/=contracts/lib/ds-test/src/` remapping. |
| `contracts/remix/QuadraticFundingRound.sol` | Regenerated via `npm run flatten:remix`. |
| `contracts/solc-out/*` | Regenerated compiler artifacts via `npm run compile:solc`. |
| `README.md` | Corrected the Foundry test status (21/21 passing). |
| `docs/TEST_CASES.md` | Corrected the Foundry test status and documented the `ds-test` shim. |
| `docs/REMIX_DEPLOY.md` | Replaced stale January-2026 example timestamps with current-valid ones. |
| `deployments/sepolia.json` | Filled with the verified Sepolia address, block, tx, owner, and constructor values. |
| `action.md` | **Added** this report. |

### Delivered implementation verified (unchanged this pass)

- `contracts/src/QuadraticFundingRound.sol` — round contract.
- `backend/src/` — Fastify API, SQLite indexer, Merkle eligibility service,
  independent results engine, unsigned calldata builders.
- `backend/test/` — 40 Vitest tests.
- `fixtures/` — example-only inputs (explicitly not a real allowlist).
- `deployments/sepolia.json` — verified live Sepolia deployment record.

---

## 3. Initial-pass verification results (exact)

### Contract — Foundry

Command (forge is not on `PATH`; invoked directly):

```powershell
& "$env:USERPROFILE\.foundry\bin\forge.exe" test -vv
```

Result:

```text
Suite result: ok. 21 passed; 0 failed; 0 skipped
Ran 1 test suite: 21 tests passed, 0 failed, 0 skipped
```

All 21 tests pass, including:

- `test_ScoreIsSquareOfSummedSquareRoots`
- `test_RepeatedContributionsAggregatePerContributor`
- `test_MatchesScaleToPoolAndNeverExceedIt`
- `test_ZeroContributionsLeavesPoolUnallocated`
- `test_ContributeRevertsForIneligibleAddress`
- `test_ContributeRevertsWithoutProofEvenIfAddressWasEligible`
- `test_ContributionEventCarriesContributor`
- `test_FinalizeRevertsBeforeRoundEnds`
- `test_ContributeRevertsAfterRoundEnds`
- `test_ContributeRevertsBeforeRoundStarts`
- `test_ProjectCanWithdrawOnlyOnce`
- `test_ReentrantPayoutCannotWithdrawTwice`
- `test_OnlyPayoutCanWithdraw`
- `test_WithdrawRevertsBeforeFinalization`
- `test_OnlyOperatorCanRegisterProjects`
- `test_RegisterRevertsForDuplicatePayout`
- `test_OperatorCanFundPoolBeforeEnd`
- `test_ReclaimUnallocatedPoolOnlyAfterFinalization`
- `test_DirectEthTransferIsRejected`
- `test_ScoreOfRejectsUnknownProject`
- `test_ContributionsAndMatchesAreFullyWithdrawable`

> Note: root-level `npm test` still fails in this shell because it calls `forge`
> without a path. Use the direct command above, or add
> `%USERPROFILE%\.foundry\bin` to `PATH`.

### Contract — solc compile

```powershell
npm run compile:solc
```

Result: success. `contracts/solc-out/contracts_src_QuadraticFundingRound_sol_QuadraticFundingRound.bin`
is 18,692 bytes; ABI is 10,507 bytes.

### Contract — Remix flatten + standalone compile

```powershell
npm run flatten:remix
solcjs --bin --abi --optimize -o <temp> contracts/remix/QuadraticFundingRound.sol
```

Result: flattened 11 files; the single-file Remix artifact compiles standalone
with the same 18,692-byte bytecode.

### Backend — typecheck

```powershell
cd backend
npm run typecheck
```

Result: passed (`tsc --noEmit`, no errors).

### Backend — tests

```powershell
cd backend
npm test
```

Result:

```text
Test Files  5 passed (5)
Tests       40 passed (40)
```

---

## 4. Requirement → evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Operator-only project registration | Met | `registerProject` is `onlyOwner`; `test_OnlyOperatorCanRegisterProjects` |
| Operator-only pool funding | Met | `fundPool` is `onlyOwner`; `test_OperatorCanFundPoolBeforeEnd` |
| Fixed enforced round window | Met | `startTime`/`endTime` immutable; contribute/finalize tests |
| Real on-chain Merkle eligibility | Met | `MerkleProof.verify` in `isEligible`; eligibility tests |
| Payable contributions tracked per contributor/project | Met | `contributionsOf`, `totalContributions`; aggregation test |
| Contributor address in events | Met | indexed `Contribution` event; event test |
| Score `(Σ√c)²` with per-contributor aggregation | Met | `_computeScore`; score + aggregation tests |
| Finalize only after round end | Met | `RoundStillOpen` guard; test |
| Proportional match capped by pool | Met | `Math.mulDiv` + `allocated > pool` invariant; scaling test |
| One-time claim with CEI + reentrancy guard | Met | `withdrawn` set before transfer, `nonReentrant`; withdrawal tests |
| Inspectable match results | Met | `MatchFinalized`/`RoundFinalized` events, `getProject(s)`, backend results API |
| Backend not a separate source of truth | Met | Results engine recomputes from raw `Contribution` events and cross-checks on-chain events/views |
| Real data only; dummy fixtures not treated as allowlist | Met | `fixtures/README.md` distinguishes examples from the live bootstrap allowlist; the published root covers only operator-controlled wallets |
| Sepolia address recorded | Met | `deployments/sepolia.json` records `0x634740A6D3334e23c24B22F73C01e69431d8310F` at block `12024921`, verified on-chain |
| No credentials in tracked files | Met | `.env.example` has blank `ADMIN_API_KEY`; no private keys/mnemonics found |

---

## 5. Known limitations

- **Round is configured.** On-chain state at block `12027466`:
  `eligibilityRoot = 0x8cb9…`, `projectCount = 2`, `matchingPool = 100000 wei`,
  `totalContributions = 0`, `finalized = false`. Allowlisted wallets can
  contribute until `endTime`.
- **The matching pool is `100000` wei (`0.0000000000001 ETH`).** Valid but
  economically negligible. `fundPool` is additive, so top it up from the operator
  wallet before `endTime` if a meaningful match is intended. No redeploy needed.
- **`endTime` is immutable and close.** The deployed round closes
  2026-11-06 00:00 UTC. A longer round requires redeploying.
- **The allowlist is a 3-address bootstrap, not the real attendee list.** The
  published root covers only the operator and the two payout wallets. Replace
  `fixtures/eligibility.local.csv` with the real Road to Devcon CSV, re-run
  `setEligibilityRoot`, and sync before inviting contributors.
- **Both projects have `metadataURI = '' ''`** (five bytes). Cosmetic, valid, and
  immutable for ids `0` and `1`.
- **Operator is trusted** to publish/update the eligibility root until the round
  ends. This is documented in `SECURITY.md`.
- **Backend is single-instance SQLite.** Adequate for one round; replace with
  Postgres for multi-instance production.
- **Results before `finalize()` are previews** and are labelled as such.
- **No frontend** in this milestone; the API/calldata endpoints are the surface.
- Root `npm test` requires `forge` on `PATH` in this environment.

---

## 6. Next steps (manual)

1. ~~Deploy the contract.~~ Done: `0x634740A6D3334e23c24B22F73C01e69431d8310F`
   at block `12024921`.
2. ~~Record the deployment.~~ Done in `deployments/sepolia.json`.
3. ~~Set `ROUND_ADDRESS` and `ROUND_START_BLOCK`, migrate, add the round.~~ Done:
   the round is in `backend/data/qf.db`.
4. ~~Publish an eligibility root.~~ Bootstrap root published. Still to do: import
   the real attendee CSV and republish the root before inviting contributors.
5. ~~Register projects and fund the pool.~~ Done, but the pool is only
   `100000` wei — top it up with `fundPool` before `endTime` if intended.
6. ~~Run `npm run sync`~~ Done: four events indexed, `verify`/`reconcile` pass.
   Next: collect contributions from allowlisted wallets.
7. After `endTime`, call `finalize()`, then let each payout address `withdraw`
   once.
8. Publish results via `/api/v1/rounds/:address/results` and
   `/results/verify`.
9. **Frontend results page is still missing.** `plan.md` asks for a public
   results page that shows why each project received what it did; the repo
   currently exposes only the API/CSV surface. This is the main outstanding
   deliverable before submission.

**Do not** commit `.env`, private keys, mnemonics, or a placeholder Sepolia
address.
