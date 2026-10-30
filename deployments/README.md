# Deployment records

`sepolia.json` tracks the canonical deployment of `QuadraticFundingRound` on
Sepolia. It starts as a placeholder because the operator deploys the flattened
contract from Remix + MetaMask.

After deploying, replace the `null` values:

| Field | Where to find it |
| --- | --- |
| `address` | Remix "Deployed Contracts" panel |
| `deploymentBlock` | The block number of the deployment transaction |
| `deploymentTx` | The deployment transaction hash |
| `operator` | The MetaMask account used as `initialOwner` |
| `constructor.startTime` / `endTime` | The timestamps passed to the constructor |
| `constructor.initialMatchingPoolWei` | The `value` sent, in wei, as a decimal string |
| `deployedAt` | ISO-8601 timestamp of deployment |

Then copy the address and block into `backend/.env`:

```dotenv
ROUND_ADDRESS=0x...
ROUND_START_BLOCK=1234567
```

Run `npm run round:add` (or start the indexer) to validate the address against
the on-chain contract.

Never put a private key, mnemonic, or authenticated RPC URL in this file.
