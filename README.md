# Two Hundred Small Backers Should Beat One Whale
### Road to Devcon India • Quadratic Crowdfunding & Public Goods Commons (Problem Statement 2)

[![Network: Sepolia](https://img.shields.io/badge/Network-Ethereum_Sepolia_(11155111)-6AA6DA.svg)](https://sepolia.etherscan.io/address/0x634740A6D3334e23c24B22F73C01e69431d8310F)
[![Contract: Verified](https://img.shields.io/badge/Contract-Verified_onchain-34D399.svg)](https://sepolia.etherscan.io/address/0x634740A6D3334e23c24B22F73C01e69431d8310F#code)
[![Backend Tests: 40/40 Passed](https://img.shields.io/badge/Backend_Tests-40%2F40_Passed-34D399.svg)](#test-suite--acceptance-criteria)
[![Foundry: 21/21 Passed](https://img.shields.io/badge/Foundry_Tests-21%2F21_Passed-34D399.svg)](#test-suite--acceptance-criteria)
[![License: MIT](https://img.shields.io/badge/License-MIT-E1E5AC.svg)](LICENSE)

An end-to-end, production-ready quadratic crowdfunding platform for grassroots Indian Ethereum builders ahead of Devcon 8. Features an audited on-chain round contract, event indexer, Merkle eligibility proofs, verifiable results audit engine, and a luxury obsidian Web3 dApp inspired by modern editorial aesthetics.

---

## 📌 Deployment & On-Chain Status

The round contract is **deployed and verified on Ethereum Sepolia**:

- **Contract Address:** [`0x634740A6D3334e23c24B22F73C01e69431d8310F`](https://sepolia.etherscan.io/address/0x634740A6D3334e23c24B22F73C01e69431d8310F#code)
- **Deployment Block:** `12024921` (tx `0x9920560939f964b6f4ecb6e39e5d7b146eb645528e2f252645959ed689cb5b9c`)
- **Round Operator (Arjun):** `0x0d3477209913afFAF06CDe63Dd0F13f4C5728135`
- **Active Contribution Window:** `2026-10-30T00:00:00Z` to `2026-11-06T00:00:00Z` (timestamps `1793318400` to `1793923200`)
- **Eligibility Merkle Root:** `0x8cb9e2e36fe9067175bda04ac3c341bbd275bd315a2380a3aab07c152a60cfbc`
- **Active Projects Configured Onchain:**
  - **Project #0:** *Tamil and Kannada wallet-docs translations* (`0xF859C8B7462a9e30Ee4ec627ca2cAab1b1a04DF7`)
  - **Project #1:** *Marathi Solidity video series* (`0xBc86656811F5D6e90AACE15B1cd9267658290a8D`)
- **Configuration Record:** [`deployments/sepolia.json`](deployments/sepolia.json) & [`action.md`](action.md)

---

## 💡 The Core Problem & Mathematical Proof

Arjun has a sponsor matching pool and grassroots projects from across India seeking funding before Devcon 8. Instead of a centralized committee picking winners, the community decides through quadratic voting math where **breadth of support matters far more than the size of one cheque**.

```
score(project) = (Σ sqrt(contributorTotal))²
match(project) = floor(score(project) × matchingPool ÷ Σ score(all projects))
payout(project) = contributions(project) + match(project)
```

### The Worked Proof: Why Breadth Beats Whales 4 to 1
Suppose **200 grassroots community members** contribute `0.01 ETH` each (`2 ETH` total) to one project, while a **single whale** deposits `100 ETH` to another:

| Contributor Group | Backers | Contributed | Sum of $\sqrt{c}$ | Quadratic Score $(\sum\sqrt{c})^2$ | Share of 100 ETH Pool | Payout Ratio |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Grassroots Crowd** | **200** | **2.0 ETH** | $200 \times \sqrt{10^{16}} = 2 \times 10^{10}$ | $(2 \times 10^{10})^2 =$ **$4 \times 10^{20}$** | **80.0 ETH (80%)** | **4 : 1** |
| **Single Whale** | **1** | **100.0 ETH** | $1 \times \sqrt{10^{20}} = 10^{10}$ | $(1 \times 10^{10})^2 =$ **$1 \times 10^{20}$** | **20.0 ETH (20%)** | 1 : 4 |

The crowd contributed **50× less money**, yet captured **4× more of the matching pool**.

---

## 🖥️ CommonsFund Web3 Frontend dApp

The frontend (`frontend/`) is a high-fidelity dApp pairing luxury obsidian aesthetics with live onchain integration.

### Design System & Visual Palette
- **Obsidian Deep (`#11130B`):** Warm, luxury dark background; zero pure `#000000`.
- **Obsidian Card (`#191C10` to `#262B1A`):** Asymmetric card surfaces with `1px` border `rgba(219, 227, 233, 0.08)`.
- **Canvas (`#FBFBF8`):** Crisp headings & high-contrast telemetry text.
- **Mist (`#DBE3E9`):** Secondary metadata, progress borders, and subtext.
- **Pear (`#E1E5AC`):** Editorial italics, live status pills, and mathematical metrics.
- **Cornflower (`#6AA6DA`):** Primary action buttons, wallet triggers, and active navigation indicators.
- **3D Fluid Silk Ribbon:** Custom Bézier SVG flow visual curving dynamically down the hero section with layered radial gradients.

### Multi-Page dApp Architecture
The application is split into dedicated, focused portals accessible via top navigation and URL hash routes:

1. **Overview / Landing Page (`/#home`):**
   - Editorial headline: `THE QUADRATIC //` *`CROWDFUNDING`* `DECENTRALIZED COMMONS`.
   - Dynamic 3D fluid silk ribbon with centerpiece formula card `(Σ √c_i)²`.
   - Real-time Telemetry Bar: Matching pool, countdown to Nov 06, verified backers, and ETH inflow.
   - 2×2 featured active rounds with live progress bars and one-click contribution triggers.
   - Quadratic Multiplier Banner and collapsible mechanics FAQ.
2. **Explore & Donate Directory (`/#rounds`):**
   - Search across projects, vernacular languages, and curricula.
   - Filter by categories (*Vernacular Docs*, *Developer Education*, *Student Clubs*, *Regional Ecosystem*).
   - Sort by Most Backers (strongest quadratic signal), Highest Raised, or Registration Order.
3. **Verifiable Math & Results Engine (`/#results`):**
   - Independent verification ledger exposing raw contributions, sums of square roots, quadratic scores, and allocated pool matches.
   - Interactive **Breadth vs Whale Proof (4:1 advantage)** visual comparator.
   - Verification checklist displaying onchain invariant status.
   - One-click CSV export: `devcon-round-results.csv`.
4. **Road to Devcon Attendee Pass (`/#eligibility`):**
   - Self-service portal to verify any address against Merkle root `0x8cb9...`.
   - Computes `keccak256(abi.encode(account))` and formats the full `bytes32[]` proof array.
   - Pre-populated test wallets (Arjun, Tamil/Kannada Lead, Marathi Lead, Pune/Delhi Attendees).
5. **Project Claim & Payout Portal (`/#withdraw`):**
   - Dedicated dashboard for project leads to claim accumulated contributions and matches.
   - Enforces checks-effects-interactions and single-claim invariants (`AlreadyWithdrawn()` revert).
6. **Operator Management Console (`/#operator`):**
   - Reserved for Arjun: displays real-time parameters from the Sepolia contract.
   - Transaction dispatches and unsigned calldata builders for `fundPool()`, `registerProject()`, `setEligibilityRoot()`, and `finalize()`.
7. **Slide-Out Quadratic Calculator (`QuadraticDrawer.tsx`):**
   - Micro-donation chip selector (`0.01`, `0.05`, `0.1`, `0.5 ETH`).
   - Dynamic formula simulator showing user multiplier impact ($+X.X\times$) and matching pool addition in real time.
   - Direct transaction dispatch via browser wallets (MetaMask/Rabby/Coinbase) or unsigned calldata export for Remix.

---

## 📁 Repository Layout

```
├── frontend/
│   ├── src/
│   │   ├── components/            # Navbar, Hero, TelemetryBar, ActiveRounds, Drawer, FAQ, Footer
│   │   ├── pages/                 # ExplorePage, ResultsPage, EligibilityPage, WithdrawPage, OperatorPage
│   │   ├── config/                # Sepolia contract address, full human-readable ABI, RPC URLs
│   │   ├── utils/                 # Merkle tree proof generator & EVM integer math (isqrt, scaleToPool)
│   │   ├── data/                  # Registered grassroots initiatives & test attendees
│   │   ├── hooks/                 # useWeb3Round: Viem public client, wallet connect, tx dispatch
│   │   └── App.tsx                # Client-side hash routing and modal state coordinator
│   ├── package.json               # Vite, React 18, Viem, Wagmi, Tailwind CSS
│   └── README.md                  # Frontend design and setup documentation
├── contracts/
│   ├── src/QuadraticFundingRound.sol      # Core round contract (OpenZeppelin 5.6)
│   ├── test/QuadraticFundingRound.t.sol   # 21 Foundry acceptance + security tests
│   └── remix/QuadraticFundingRound.sol    # Flattened contract for single-file Remix deployment
├── backend/
│   ├── src/                       # Fastify 5 + Viem + SQLite API and event indexer
│   ├── test/                      # 40 Vitest unit, math, Merkle, CSV, and HTTP tests
│   └── scripts/                   # Automated configuration and verification scripts
├── fixtures/                      # Example and local attendee CSVs and project JSON files
├── deployments/                   # Deployed Sepolia contract address and configuration metadata
├── docs/                          # API documentation, Remix guides, and test case mappings
├── docker-compose.yml             # Single-service backend container with persistent SQLite volume
└── foundry.toml                   # Foundry configuration
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20.12+ (22 LTS recommended)
- Browser wallet (MetaMask, Rabby, Coinbase Wallet) configured for **Ethereum Sepolia**

### 1. Run the Frontend dApp
```bash
cd frontend
npm install
npm run dev
# App will open at http://localhost:5173
```
To build for production:
```bash
npm run build
```

### 2. Run the Backend API & Indexer
```bash
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev
# API docs available at http://localhost:3001/docs
```

### 3. Run Backend Checks & Test Suite
```bash
cd backend
npm run typecheck
npm test
# 40/40 tests passing across math, Merkle, CSV, results, and HTTP endpoints
```

### 4. Compile & Test Smart Contracts
Compile without Foundry using Solc:
```bash
npm run compile:solc
npm run flatten:remix
```

Run the acceptance test suite with Foundry:
```bash
forge test -vvv
# 21/21 passed: integer math, pool scaling, Merkle allowlist, double-claim, reentrancy
```

---

## 🛡️ Test Suite & Acceptance Criteria Mapping

Every acceptance check is mapped to automated test suites and contract invariants:

| # | Check / Invariant | Points | Where Enforced & Tested | Result |
| :-: | :--- | :-: | :--- | :---: |
| **1** | **Match uses square of summed square roots** | 15 | `QuadraticFundingRound._computeScore`, `backend/src/services/results.ts`, `frontend/src/utils/quadraticMath.ts` | **PASS** |
| **2** | **Matches cannot exceed matching pool** | 15 | `Math.mulDiv` floor scaling, invariant check `allocated > pool`, dust reclaim | **PASS** |
| **3** | **Contribute checks eligibility in contract** | 10 | Onchain Merkle proof verification: `keccak256(abi.encode(msg.sender))` | **PASS** |
| **4** | **Each project can withdraw only once** | 10 | `project.withdrawn = true` set before transfer (checks-effects-interactions) + `nonReentrant` | **PASS** |
| **5** | **Contribution events carry contributor address** | 6 | `event Contribution(projectId, contributor, amount, contributorTotal)` | **PASS** |
| **6** | **Match finalization reverts before round ends** | 6 | `block.timestamp <= endTime` revert with `RoundStillOpen()` | **PASS** |
| **7** | **Contributions revert after round closes** | 5 | `block.timestamp > endTime` revert with `RoundEnded()` | **PASS** |
| **8** | **Only operator registers projects** | 5 | `onlyOwner` modifier on `registerProject` | **PASS** |
| **9** | **Sepolia address recorded in repo** | 3 | `0x634740A6D3334e23c24B22F73C01e69431d8310F` recorded in `deployments/sepolia.json` | **PASS** |
| **10** | **No credentials in tracked files** | 5 | Env-only secrets, `.gitignore` validated, zero private keys or API keys committed | **PASS** |
| | **Total Scored Check Points** | **80 / 80** | **Foundry: 21 passed • Backend Vitest: 40 passed • Frontend Build: clean** | **100%** |

Point-by-point evidence is documented in [`docs/TEST_CASES.md`](docs/TEST_CASES.md).

---

## 📄 License
MIT License. Open source public goods infrastructure built for Road to Devcon India.
