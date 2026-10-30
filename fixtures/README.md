# Fixtures

Example inputs only. None of these addresses belong to real people, and none of
them hold funds.

- `eligibility.example.csv` — attendee list accepted by
  `npm run eligibility:import` and `POST /admin/rounds/:address/eligibility/import`.
  Columns: `address,label,source` (headers are optional; one address per line
  works too).
- `projects.example.json` — sample `registerProject` payloads for the admin
  calldata endpoint. Project IDs are assigned on-chain in registration order.
- `eligibility.local.csv` — the bootstrap allowlist for the live Sepolia round:
  the operator plus the two operator-controlled payout wallets. Replace it with
  the real attendee list when available and republish the root.
- `projects.local.json` — the two projects being registered on the live Sepolia
  round, with operator-controlled payout addresses.

Generate real data from the verified Road to Devcon attendee list. Keep personal
data out of Git; import it locally and publish only the Merkle root on-chain.
