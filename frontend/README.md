# CommonsFund — Devcon India Quadratic Crowdfunding dApp
## Two Hundred Small Backers Beat One Whale

High-fidelity, production-grade Web3 frontend built with Vite, React 18, TypeScript, Tailwind CSS, and Viem for Problem Statement 2 (Road to Devcon India Quadratic Matching & Commons Allocation).

Inspired by the luxury obsidian design system (`82173.png`), this dApp pairs editorial serif typography (`Playfair Display`) and modern sans-serif (`Plus Jakarta Sans`) with organic fluid silk mesh gradients, real onchain telemetry, and an independent mathematical audit engine.

---

## 🎨 Visual System & Palette (Obsidian Deep Luxury Dark)

- **Obsidian Deep**: `#11130B` (Overall canvas background)
- **Obsidian Card**: `#262B1A` & `#191C10` (Card containers with 1px border `rgba(219, 227, 233, 0.08)`)
- **Canvas**: `#FBFBF8` (Crisp text & editorial headings)
- **Mist**: `#DBE3E9` (Secondary metadata, telemetry, and subtle borders)
- **Cornflower**: `#6AA6DA` (Primary action, wallet connection, active states)
- **Pear**: `#E1E5AC` (Editorial italics accent, formula badges, and math highlights)
- **Fluid Mesh Ribbon**: Layered organic Bézier SVG flow visual in lime-pear and cornflower-blue.

---

## 🏛️ On-Chain Deployment & Real Protocol Integration

All data and unsigned transactions target the live verified contract on Ethereum Sepolia:
- **Contract Address**: [`0x634740A6D3334e23c24B22F73C01e69431d8310F`](https://sepolia.etherscan.io/address/0x634740A6D3334e23c24B22F73C01e69431d8310F)
- **Deployment Block**: `12024921` (tx `0x9920560939f964b6f4ecb6e39e5d7b146eb645528e2f252645959ed689cb5b9c`)
- **Round Operator (Arjun)**: `0x0d3477209913afFAF06CDe63Dd0F13f4C5728135`
- **Active Window**: Oct 30, 2026 – Nov 06, 2026 (`1793318400` to `1793923200`)
- **Attendee Merkle Root**: `0x8cb9e2e36fe9067175bda04ac3c341bbd275bd315a2380a3aab07c152a60cfbc` (Road to Devcon verified attendee allowlist)

---

## 🧭 Multi-Page Sophisticated Architecture

The application provides dedicated, feature-rich views accessible from the persistent top navigation and URL hash routes:

1. **Overview / Landing Page (`/` or `#home`)**:
   - Editorial Hero section with `THE QUADRATIC // *CROWDFUNDING* DECENTRALIZED COMMONS`
   - Layered organic 3D fluid silk flow visual with floating `(Σ √c_i)²` formula pill
   - Real-time Telemetry Bar (Matching Pool, countdown to Nov 6 close, verified backer count, total ETH inflow)
   - Active Rounds 2x2 featured grid with live progress bars and quick contribute triggers
   - "QUADRATIC MATCHING MULTIPLIER ACTIVE NOW" banner
   - Collapsible mechanics FAQ explaining the 4:1 small backer advantage and Merkle trees

2. **Explore & Donate Directory (`#rounds`)**:
   - Complete directory of Indian developer communities, vernacular docs, and student chapters
   - Search by name or description; category filter (`Vernacular Docs`, `Developer Education`, `Student Clubs`, `Regional Ecosystem`)
   - Sorting by Most Backers (high QF signal), Highest Raised, or Registration Order

3. **Verifiable Audit & Results Engine (`#results`)**:
   - Implements Acceptance Criteria #6: "Build a results page that shows why each project received what it did, so anyone can verify the math"
   - Transparent table detailing project payouts, backers, raw contributions, quadratic score, and allocated match
   - Interactive **Breadth vs Whale Proof** comparator demonstrating how 200 small backers (0.01 ETH) defeat 1 whale (100 ETH) 4:1 in a 100 ETH pool
   - Integrity checks confirming floor integer scaling and non-reentrancy
   - One-click CSV export (`devcon-round-results.csv`)

4. **Road to Devcon Attendee Pass & Merkle Verifier (`#eligibility`)**:
   - Enter any Ethereum address to compute `keccak256(abi.encode(account))` and verify against root `0x8cb9...`
   - Displays full `bytes32[]` proof array with one-click JSON copy
   - Pre-populated test attendee selector (Arjun, Tamil/Kannada lead, Marathi series lead, Pune/Delhi attendees)

5. **Project Lead Claim & Payout Portal (`#withdraw`)**:
   - Dedicated portal for project creators (Marathi video series, Tamil/Kannada translators, etc.)
   - Auto-validates connected wallet against registered project payout addresses
   - Prevents double claims with single-claim checks-effects-interactions verification
   - Unsigned calldata generator for Remix / Cast

6. **Operator Management Console (`#operator`)**:
   - Reserved for Arjun: displays real-time parameters from the Sepolia contract
   - Administrative forms with unsigned calldata & wallet triggers: `fundPool()`, `registerProject()`, `setEligibilityRoot()`, `finalize()`

7. **Progressive Disclosure Slide-out Quadratic Drawer**:
   - Slide-out drawer with contribution chips (`0.01`, `0.05`, `0.1`, `0.5 ETH`)
   - Live multiplier formula calculator showing user impact boost (`+X.Xx`) and estimated matching addition in real-time
   - One-click Web3 wallet transaction dispatch or Remix calldata export

---

## ⚡ Quickstart

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (TypeScript check + Vite bundle)
npm run build
```
