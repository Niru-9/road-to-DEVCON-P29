# Scored test cases → evidence

The round is graded against 10 checks. This file maps each check to the exact
code and tests that satisfy it.

Verification commands:

```bash
cd backend
npm run typecheck
npm test          # 40 passing tests at last run
```

```bash
# Foundry test suite (forge may need to be added to PATH first):
forge test -vvv
```

Last run: **21 passed, 0 failed** (forge 1.8.1, solc 0.8.24, optimizer on). The contract
and the flattened Remix file are also compiled with `solc 0.8.24` via
`npm run compile:solc`, and the backend independently reproduces the same
integer math.

A vendored `ds-test` shim lives at `contracts/lib/ds-test/src/test.sol` because
the pinned `forge-std@1.1.2` package does not ship `ds-test/test.sol`; the
remapping is declared in `foundry.toml`.

---

## 1. Match uses the square of summed square roots — 15 points

**Contract**

- `contracts/src/QuadraticFundingRound.sol`
  - `_computeScore` (lines ~366–378): `sumOfRoots += Math.sqrt(amount)` per
    contributor, returns `sumOfRoots * sumOfRoots`.
  - `finalize` stores and emits that score before any pool scaling.
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_ScoreIsSquareOfSummedSquareRoots`
  - `test_RepeatedContributionsAggregatePerContributor`

**Backend cross-check**

- `backend/src/services/results.ts` (`snapshotProjects`) aggregates by
  `(project, contributor)` and computes `score = sumSqrt * sumSqrt`.
- `backend/test/results.test.ts`
  - “lets 200 small backers out-match one whale of 100 ETH”
  - “aggregates a contributor before taking the square root”

The scoring is applied **before** the pool division, as required.

---

## 2. Total matches cannot exceed the matching pool — 15 points

**Contract**

- `finalize` uses
  `Math.mulDiv(scores[i], pool, scoreSum)` for each project, sums `allocated`,
  and reverts if `allocated > pool` (defensive invariant).
- `unallocatedPool = pool - allocated`; the operator can reclaim only that dust.
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_MatchesScaleToPoolAndNeverExceedIt`
  - `test_ZeroContributionsLeavesPoolUnallocated`
  - `test_ContributionsAndMatchesAreFullyWithdrawable`

**Backend cross-check**

- `backend/src/utils/bigint.ts` `scaleToPool` replicates
  `floor(score * pool / totalScore)` with `BigInt`.
- `backend/test/bigint.test.ts` verifies that scaling every score never exceeds
  the pool.
- `backend/src/services/results.ts` exposes
  `integrity.checks.totalMatchesWithinPool`.

---

## 3. Contribute checks eligibility in the contract — 10 points

**Contract**

- `contribute` calls `isEligible(msg.sender, proof)` and reverts with
  `NotEligible` if false.
- `isEligible` uses `MerkleProof.verify(proof, eligibilityRoot, eligibilityLeaf(msg.sender))`.
- `eligibilityLeaf(address) = keccak256(abi.encode(address))`.
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_ContributeRevertsForIneligibleAddress`
  - `test_ContributeRevertsWithoutProofEvenIfAddressWasEligible`

**Backend support (not the gate)**

- `backend/src/services/merkle.ts` builds the identical sorted-pair tree.
- `backend/test/merkle.test.ts` checks leaves, roots, odd layers, and proofs.
- `backend/test/api.test.ts` imports a set and verifies proofs over HTTP.

Eligibility is enforced on-chain even if the backend or frontend is offline or
malicious.

---

## 4. Each project can withdraw only once — 10 points

**Contract**

- `withdraw` checks `project.withdrawn` on entry, sets
  `project.withdrawn = true` **before** `_sendEth`, and is `nonReentrant`.
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_ProjectCanWithdrawOnlyOnce`
  - `test_ReentrantPayoutCannotWithdrawTwice`
  - `test_OnlyPayoutCanWithdraw`
  - `test_WithdrawRevertsBeforeFinalization`

**Backend support**

- `backend/src/db/projects.ts` `markProjectWithdrawn` and the `withdrawn` field.
- `backend/src/services/results.ts` reports `withdrawn`,
  `withdrawnAmounts`, and `outstandingPayouts`.

The state update and external call are in checks-effects-interactions order.

---

## 5. Contribution events carry the contributor’s address — 6 points

**Contract**

```solidity
event Contribution(
    uint256 indexed projectId,
    address indexed contributor,
    uint256 amount,
    uint256 contributorTotal
);
```

Emitted in `contribute` with `msg.sender`.

- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_ContributionEventCarriesContributor`

**Backend**

- `backend/src/chain/abi.ts` declares the event.
- `backend/src/chain/indexer.ts` stores `contributor` from the event.
- `backend/src/db/schema.ts` `contributions.contributor` is `NOT NULL`.
- `backend/test/api.test.ts` asserts contributor addresses appear in the CSV
  export.

The event includes both the individual payment (`amount`) and the aggregated
total for that contributor (`contributorTotal`), which makes the square-root math
auditable.

---

## 6. Match finalization reverts before the round ends — 6 points

**Contract**

- `finalize` starts with `if (block.timestamp <= endTime) revert RoundStillOpen();`
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_FinalizeRevertsBeforeRoundEnds`
  - `test_WithdrawRevertsBeforeFinalization`

**Backend**

- `backend/src/services/results.ts` `roundPhase` reports
  `awaiting-finalization` and adds a warning that matches are previews.
- `backend/test/results.test.ts` checks phase boundaries.

---

## 7. Contributions revert after the round closes — 5 points

**Contract**

- `contribute` checks `block.timestamp < startTime` → `RoundNotStarted`, then
  `block.timestamp > endTime` → `RoundEnded`.
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_ContributeRevertsAfterRoundEnds`
  - `test_ContributeRevertsBeforeRoundStarts`

**Backend**

- The indexer/ledger never decides validity; the contract does.
- The backend still labels results by phase so the UI cannot pretend a closed
  round is open.

---

## 8. Only the round operator can register projects — 5 points

**Contract**

- `registerProject` is `onlyOwner`.
- The operator is set through `Ownable`/`Ownable2Step`.
- Duplicate payouts are rejected.
- `contracts/test/QuadraticFundingRound.t.sol`
  - `test_OnlyOperatorCanRegisterProjects`
  - `test_RegisterRevertsForDuplicatePayout`

**Backend**

- `POST /api/v1/admin/rounds/:address/projects/calldata` only builds the
  transaction; the contract still requires the owner’s signature.

---

## 9. Deployed Sepolia address is recorded in the repo — 3 points

**Status: deployed on Sepolia.**

The file `deployments/sepolia.json` is the canonical record. It holds:

```json
{
  "address": "0x634740A6D3334e23c24B22F73C01e69431d8310F",
  "deploymentBlock": 12024921,
  "deploymentTx": "0x9920560939f964b6f4ecb6e39e5d7b146eb645528e2f252645959ed689cb5b9c"
}
```

The deployment was read back from Sepolia and matches the recorded operator,
eligibility root, project count, matching pool, and round window. The deployment
steps remain in [`docs/REMIX_DEPLOY.md`](REMIX_DEPLOY.md) for reproducibility.

---

## 10. No credentials in any tracked file — 5 points

Evidence:

- `.gitignore` excludes `.env`, `.env.*` (except `.env.example`), `*.pem`,
  `*.key`, `*.p12`, `*.keystore`, `mnemonic*`, `seed*`, `secrets/`, and database
  files.
- `backend/.env.example` contains only public defaults; `ADMIN_API_KEY` is blank.
- The backend never accepts or stores a private key. It uses a viem
  `PublicClient` only, and all write helpers return **unsigned** calldata.
- The admin key is read from `ADMIN_API_KEY` at runtime, compared with
  `timingSafeEqual`, and never logged or persisted.
- No authenticated RPC URL is committed; the example uses a public Sepolia
  endpoint.
- The Foundry/Remix deployment is performed manually in the operator’s browser,
  so no deployment key exists in the repo.

Recommended final check before submitting:

```bash
git grep -nEi "private[_ -]?key|mnemonic|seed phrase|api[_-]?key|https://[^ ]*@|0x[a-fA-F0-9]{64}" \
  -- ':!package-lock.json' ':!backend/package-lock.json'
```

Expect only documentation mentions and test fixtures — no live secret values.

---

## Other adversarial coverage

The Foundry suite also covers:

- `test_DirectEthTransferIsRejected` — ETH cannot bypass accounting.
- `test_OperatorCanFundPoolBeforeEnd` — pool top-ups.
- `test_ReclaimUnallocatedPoolOnlyAfterFinalization` — dust safety.
- `test_ScoreOfRejectsUnknownProject` — bounds checks.
- `test_ContributionsAndMatchesAreFullyWithdrawable` — full payout path.

The backend suite additionally covers:

- exact integer square roots at wei scale,
- sorted-pair Merkle roots and proofs with odd leaf counts,
- duplicate removal,
- CSV header/BOM/invalid-address handling,
- pre-finalization previews vs on-chain final matches,
- integrity failures for orphan contributions and corrupted matches,
- admin authentication, validation errors, 404s, CSV downloads, and calldata
  decoding.
