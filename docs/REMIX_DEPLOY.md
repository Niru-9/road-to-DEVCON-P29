# Deploying from Remix + MetaMask

The contract is already flattened into a single file so Remix needs no npm
import resolution:

```
contracts/remix/QuadraticFundingRound.sol
```

Foundry is optional for this workflow. The flattened file was compiled
standalone with `solc 0.8.24` and the optimizer enabled.

---

## 1. Prepare the constructor arguments

```solidity
constructor(
    address initialOwner,
    bytes32 initialEligibilityRoot,
    uint64  startTime_,
    uint64  endTime_
) payable
```

| Argument | Example | Notes |
| --- | --- | --- |
| `initialOwner` | your MetaMask address | The operator. Use `Ownable2Step` later to hand over. |
| `initialEligibilityRoot` | `0x0000000000000000000000000000000000000000000000000000000000000000` | Use zero, then publish the imported root later. |
| `startTime_` | `1793318400` | Unix seconds. Contributions open inclusively. |
| `endTime_` | `1793923200` | Unix seconds. Must be after `startTime_` and in the future. |
| `value` | `5` ETH | Optional initial matching pool. Can also call `fundPool()` later. |

Get a future timestamp:

```bash
node -e "console.log(Math.floor(Date.now()/1000))"
node -e "console.log(Math.floor(Date.now()/1000) + 14*24*60*60)"
```

Example constructor arguments for a 7-day round opening 30 Oct 2026 00:00 UTC
and closing 6 Nov 2026 00:00 UTC, with no initial root:

```
0xYourOperatorAddress,0x0000000000000000000000000000000000000000000000000000000000000000,1793318400,1793923200
```

> The timestamps above are examples, not permanent defaults. Always regenerate
> them before deploying; `endTime_` must be in the future at the moment of
> deployment.

Remix will ask for each field separately; paste the values without commas.

> `endTime_` must be strictly greater than `startTime_`, and `endTime_` must be
> in the future or the constructor reverts with `InvalidRoundWindow`.

---

## 2. Compile and deploy

1. Open <https://remix.ethereum.org>.
2. Create `QuadraticFundingRound.sol` and paste the entire contents of
   `contracts/remix/QuadraticFundingRound.sol`.
3. In **Solidity Compiler**:
   - Compiler: `0.8.24`
   - EVM version: `cancun` (the repo's `foundry.toml` targets cancun)
   - Enable **Optimize**, runs `200`
4. In **Deploy & Run Transactions**:
   - Environment: **Injected Provider - MetaMask**
   - Network: **Sepolia**
   - Contract: `QuadraticFundingRound`
   - Fill the constructor fields
   - Set **Value** to the initial pool in ETH (or `0`)
5. Click **Deploy** and confirm in MetaMask.
6. Copy the deployed address and the **deployment transaction block number**
   from the transaction details.

If Remix shows a warning about SPDX or pragma, it is safe to ignore; the file has
one SPDX header and one pragma at the top. If it shows an import error, confirm
you pasted the *flattened* file, not `contracts/src/...`.

---

## 3. Record the deployment

Edit `deployments/sepolia.json`:

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contract": "QuadraticFundingRound",
  "address": "0xYourDeployedAddress",
  "deploymentBlock": 1234567,
  "deploymentTx": "0xYourDeployTxHash",
  "operator": "0xYourOperatorAddress",
  "constructor": {
    "initialEligibilityRoot": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "startTime": 1793318400,
    "endTime": 1793923200,
    "initialMatchingPoolWei": "5000000000000000000"
  },
  "deployedAt": "2026-10-30T00:00:00.000Z"
}
```

Then add the same values to `backend/.env`:

```dotenv
ROUND_ADDRESS=0xYourDeployedAddress
ROUND_START_BLOCK=1234567
ROUND_NAME=Road to Devcon Quadratic Round
```

Alternatively, after starting the backend:

```bash
cd backend
npm run round:add -- 0xYourDeployedAddress --start-block 1234567 --name "Road to Devcon Quadratic Round"
```

The command reads `owner()`, `startTime()`, `endTime()`, `projectCount()`, and the
pool fields from the contract to validate it.

---

## 4. Publish eligibility

1. Put the attendee list in a CSV (see
   [`fixtures/eligibility.example.csv`](../fixtures/eligibility.example.csv)):

   ```csv
   address,label,source
   0xabc…,Asha,road-to-devcon-pune
   0xdef…,Bob,road-to-devcon-delhi
   ```

2. Import it and get calldata:

   ```bash
   cd backend
   npm run eligibility:import -- 0xYourDeployedAddress --file ../fixtures/eligibility.example.csv
   ```

   The command prints the Merkle root, leaf count, warnings, and an unsigned
   `setEligibilityRoot(bytes32)` transaction. It exits with code `2` when the
   local root does not match the on-chain root, which is expected before you
   publish it.

   You can also use `POST /api/v1/admin/rounds/:address/eligibility/import`.

3. In Remix, select the deployed contract, find `setEligibilityRoot`, paste the
   root, and send it from the operator wallet. Or submit the `data` field from
   the printed transaction through a wallet.

4. Run `npm run sync -- 0xYourDeployedAddress` (or wait for the indexer). Check:

   ```bash
   curl http://localhost:3001/api/v1/rounds/0xYourDeployedAddress/eligibility/root
   ```

   `rootMatchesOnchain` should become `true`.

> The root can be updated until `endTime`, for example to onboard late verified
> attendees. Contributions already made remain counted.

---

## 5. Register projects and fund the pool

As the operator, call `registerProject(payout, name, metadataURI)` once per
project. From the backend:

```bash
curl -X POST http://localhost:3001/api/v1/admin/rounds/0xRound/projects/calldata \
  -H "content-type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"payout":"0xProjectPayout","name":"Marathi Solidity video series","metadataUri":"ipfs://…"}'
```

The response contains an unsigned transaction. Submit it from the operator
wallet. Project IDs are assigned in registration order starting at `0`. Payout
addresses must be unique and able to receive ETH.

Funding options:

- Send ETH as the constructor `value`, or
- Call `fundPool()` with value as the operator, or
- Use `POST /api/v1/admin/rounds/:address/fund-pool/calldata`.

`fundPool`, `registerProject`, and `setEligibilityRoot` all stop working at
`endTime`.

---

## 6. Community contributions

For each eligible contributor, call:

```bash
curl -X POST http://localhost:3001/api/v1/rounds/0xRound/contribute/calldata \
  -H "content-type: application/json" \
  -d '{"address":"0xContributor","projectId":0,"amountWei":"10000000000000000"}'
```

The response contains `{ to, data, value }`. Submit it from that contributor's
wallet. The contract verifies the Merkle proof and rejects:

- addresses outside the tree (`NotEligible`),
- contributions before `startTime` (`RoundNotStarted`),
- contributions after `endTime` (`RoundEnded`),
- zero amounts (`ZeroAmount`),
- a project payout contributing to its own project (`SelfContribution`).

The backend refuses to build calldata while the local eligibility root is not
the on-chain root (`409 eligibility_root_not_published`).

---

## 7. Finalize, verify, withdraw

After `endTime`:

1. Call `finalize()` from any account (the operator is not special here). The
   backend helper is `POST /api/v1/admin/rounds/:address/finalize/calldata`, or
   use Remix directly.
2. Confirm the result:

   ```bash
   cd backend
   npm run verify -- 0xYourDeployedAddress
   curl http://localhost:3001/api/v1/rounds/0xYourDeployedAddress/results/verify
   ```

   Every integrity check should be `true` and `warnings` should be empty.
3. Each project payout address calls `withdraw(projectId)` once. The backend
   returns the unsigned transaction from
   `GET /api/v1/rounds/:address/projects/:projectId`.
4. The operator may call `reclaimUnallocatedPool()` to recover rounding dust.
   This never touches contributions or allocated matches.

### Manual contract checks in Remix

| Function | Expected |
| --- | --- |
| `owner()` | Your operator address |
| `startTime()` / `endTime()` | Your chosen window |
| `matchingPool()` | Funded amount |
| `totalContributions()` | Sum of all contributions |
| `eligibilityRoot()` | Published Merkle root |
| `isEligible(addr, proof)` | `true` for attendees |
| `scoreOf(projectId)` | `(Σ√c)²` |
| `finalized()` | `false` until `finalize()` |
| `getProject(id)` | contributions, match, withdrawn |

### What can go wrong

| Error | Cause |
| --- | --- |
| `InvalidRoundWindow` | `endTime <= startTime` or `endTime <= now` at deploy |
| `RoundNotStarted` | Contributing before `startTime` |
| `RoundEnded` | Contributing/registering/funding after `endTime` |
| `RoundStillOpen` | `finalize()` called at or before `endTime` |
| `NotEligible` | Wrong proof, wrong root, or address not in the tree |
| `SelfContribution` | Project payout contributing to its own project |
| `DuplicatePayout` | Reusing a payout address |
| `AlreadyWithdrawn` | Second `withdraw()` for the same project |
| `NotProjectPayout` | Someone other than the payout calls `withdraw()` |
| `NothingToWithdraw` | Zero contributions and zero match |

---

## 8. Frontend handoff (later milestone)

Everything a results page needs is already served:

- `GET /api/v1/rounds/:address/results` — scores, matches, contributor breakdown
- `GET /api/v1/rounds/:address/results/verify` — integrity checks
- `GET /api/v1/rounds/:address/results.csv` — downloadable audit trail
- `POST /api/v1/rounds/:address/eligibility/proof` — wallet → proof
- `POST /api/v1/rounds/:address/contribute/calldata` — wallet → transaction

The frontend should submit the unsigned transaction with the connected wallet
and then refresh results after the indexer observes the event.
