# Security notes

This is an MVP and **has not been audited**. Read this before putting real funds
in the matching pool.

## Trust model

| Actor | Trusted for | Not trusted for |
| --- | --- | --- |
| Round operator | Curating the attendee Merkle tree, registering projects, funding the pool, reclaiming rounding dust | Taking project contributions or allocated matches |
| Contributors | Paying ETH through `contribute` | Creating valid proofs outside the eligibility tree |
| Project payout addresses | Withdrawing their own project once | Withdrawing another project or contributing to themselves |
| Backend | Indexing, proving membership, computing/reporting results | Holding keys, signing, or moving funds |
| Public RPC | Serving chain reads and logs | Correctness of final results (the results engine re-derives them) |

The operator is deliberately powerful before the round ends. A community round
of this size cannot avoid a curator for the attendee list. What matters is that
the operator **cannot redirect contributions or finalize early**, and that the
result is independently reproducible.

## Contract controls

### Eligibility is on-chain

`contribute` requires a Merkle proof against `eligibilityRoot`. The frontend and
backend are not the gate. Leaf format is `keccak256(abi.encode(address))`.

The root can be updated until `endTime` (to onboard late verified attendees).
This means the operator can block *future* contributions by changing the root,
but cannot erase contributions already made or alter historical events.

### Score and pool math

- Each contributor total is aggregated before `Math.sqrt`, preventing split
  transactions from inflating a score.
- `Math.sqrt` floors every root; `Math.mulDiv` floors every pool scaling.
- `finalize` asserts `allocated <= pool` defensively, then stores
  `unallocatedPool = pool - allocated`.
- Only the dust is reclaimable; contributions and matches remain in the contract.

### Withdrawal safety

- Only the registered payout address may call `withdraw(projectId)`.
- `withdrawn` is set to `true` **before** the ETH transfer (checks-effects-interactions).
- `nonReentrant` is applied to `withdraw`, `contribute`, `finalize`, and
  `reclaimUnallocatedPool`.
- A project with a zero payout reverts with `NothingToWithdraw` instead of
  burning gas.
- Payout addresses must be able to receive ETH. If the operator registers a
  contract that rejects ETH, that project cannot withdraw. Register an EOA or a
  payable receiver.

### Round window

- `contribute` reverts before `startTime` and after `endTime`.
- `finalize` reverts while `block.timestamp <= endTime`.
- `registerProject`, `fundPool`, and `setEligibilityRoot` stop at `endTime`.

### Other contract guards

- `receive()` reverts, so ETH accounting cannot be bypassed with a plain transfer.
- Duplicate payout addresses are rejected, preventing two project IDs from
  sharing one withdrawal identity.
- A project payout cannot contribute to its own project.
- `Ownable2Step` avoids accidentally handing ownership to a wrong address.

## Backend controls

- **No private keys.** The process uses a viem `PublicClient`; it cannot sign.
- **Unsigned calldata only.** Every write helper returns `{ chainId, to, data,
  value, submittedBy }` for a wallet to sign.
- **Admin API is opt-in.** All `/api/v1/admin/*` routes are disabled unless
  `ADMIN_API_KEY` is set. The key is compared with `crypto.timingSafeEqual` and
  is never stored in SQLite or returned.
- **Input validation.** Zod validates addresses, bytes32 values, numeric ranges,
  pagination, and amount strings. Amounts are parsed with `BigInt`, never
  `Number`.
- **Rate limiting.** Global limit configurable through `RATE_LIMIT_MAX` and
  `RATE_LIMIT_WINDOW`.
- **No secrets in logs.** Admin keys are not logged. RPC URLs may contain
  credentials, so the example config uses a public endpoint and `.env` is
  gitignored.
- **Read-only results.** Results are derived from events and can be reconciled
  against contract views; no endpoint mutates on-chain state.
- **SQL injection.** Every SQL statement is parameterized. The only interpolated
  SQL is a fixed clause list built from booleans.

## Known limitations / residual risks

1. **Operator centralization.** The operator curates eligibility and registers
   projects. A malicious operator could omit a legitimate attendee or register a
   project with a payout they control. Mitigation: publish the attendee list and
   registration transactions; the Merkle root is on-chain.
2. **Sybil resistance is only as good as the attendee list.** One person with two
   eligible addresses gets two square roots. The list is the trust anchor.
3. **No refund path.** Contributions are final and are paid to project payout
   addresses if the round finalizes. If a round never finalizes, funds remain
   locked until someone calls the permissionless `finalize()`.
4. **No pause / upgradeability.** Immutable by design; bugs cannot be patched in
   place. Deploy a new round if needed.
5. **Public RPC dependency.** Results can be stale or unavailable if the RPC
   fails. The `integrity` block and `npm run verify` make drift visible.
6. **SQLite is single-writer.** Do not run multiple backend replicas against the
   same file. Use one instance or migrate to Postgres.
7. **Rate limiting is per-process.** Behind multiple instances, use an edge
   limiter.
8. **No audit.** The contract and backend are small and tested, but not audited.
   Consider an independent review before a large pool.

## Credential hygiene

Tracked files contain no private keys, seed phrases, API keys, or authenticated
RPC URLs. `.gitignore` excludes `.env*` (except `.env.example`), keystores,
mnemonics, and database files.

Generate an admin key locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put it only in `backend/.env` or the deployment platform's secret store.

## Reporting

If you find a vulnerability, do not open a public issue with exploit details.
Contact the round operator privately and allow time for a fix or a coordinated
disclosure.
