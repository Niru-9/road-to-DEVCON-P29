import { parseAbi, type Address } from 'viem';

export const SEPOLIA_CHAIN_ID = 11155111;

export const CONTRACT_ADDRESS: Address = '0x634740A6D3334e23c24B22F73C01e69431d8310F';
export const OPERATOR_ADDRESS: Address = '0x0d3477209913afFAF06CDe63Dd0F13f4C5728135';
export const DEPLOYMENT_BLOCK = 12024921;

export const RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://eth-sepolia.public.blastapi.io'
];

export const ROUND_CONFIG = {
  name: 'Road to Devcon India Quadratic Round',
  operator: OPERATOR_ADDRESS,
  contractAddress: CONTRACT_ADDRESS,
  deploymentBlock: DEPLOYMENT_BLOCK,
  startTime: 1793318400, // 2026-10-30T00:00:00Z
  endTime: 1793923200,   // 2026-11-06T00:00:00Z
  initialEligibilityRoot: '0x8cb9e2e36fe9067175bda04ac3c341bbd275bd315a2380a3aab07c152a60cfbc',
  matchingPoolWei: 100000n, // Configured onchain; additive via fundPool()
  matchingPoolDisplayEth: 100.0, // Benchmark matching pool for community modeling
};

export const QUADRATIC_FUNDING_ABI = parseAbi([
  // Views
  'function startTime() view returns (uint64)',
  'function endTime() view returns (uint64)',
  'function eligibilityRoot() view returns (bytes32)',
  'function matchingPool() view returns (uint256)',
  'function totalContributions() view returns (uint256)',
  'function totalScore() view returns (uint256)',
  'function totalMatchAllocated() view returns (uint256)',
  'function unallocatedPool() view returns (uint256)',
  'function finalized() view returns (bool)',
  'function unallocatedPoolReclaimed() view returns (bool)',
  'function projectCount() view returns (uint256)',
  'function owner() view returns (address)',
  'function isRegisteredPayout(address) view returns (bool)',
  'function contributionsOf(uint256 projectId, address contributor) view returns (uint256)',
  'function eligibilityLeaf(address account) pure returns (bytes32)',
  'function isEligible(address account, bytes32[] proof) view returns (bool)',
  'function scoreOf(uint256 projectId) view returns (uint256)',
  'function getContributors(uint256 projectId) view returns (address[])',
  'function getProject(uint256 projectId) view returns ((address payout, string name, string metadataURI, uint256 contributions, uint256 matchAmount, bool withdrawn))',
  'function getProjects() view returns ((address payout, string name, string metadataURI, uint256 contributions, uint256 matchAmount, bool withdrawn)[])',
  // Operator actions
  'function registerProject(address payout, string name, string metadataURI) returns (uint256 projectId)',
  'function fundPool() payable',
  'function setEligibilityRoot(bytes32 newRoot)',
  'function reclaimUnallocatedPool()',
  // Contributor actions
  'function contribute(uint256 projectId, bytes32[] proof) payable',
  // Finalization / withdrawal
  'function finalize()',
  'function withdraw(uint256 projectId)',
  // Events
  'event ProjectRegistered(uint256 indexed projectId, address indexed payout, string name, string metadataURI)',
  'event Contribution(uint256 indexed projectId, address indexed contributor, uint256 amount, uint256 contributorTotal)',
  'event EligibilityRootUpdated(bytes32 indexed root)',
  'event PoolFunded(address indexed funder, uint256 amount)',
  'event RoundFinalized(uint256 totalScore, uint256 matchingPool, uint256 totalMatchAllocated)',
  'event MatchFinalized(uint256 indexed projectId, uint256 score, uint256 matchAmount)',
  'event Withdrawal(uint256 indexed projectId, address indexed payout, uint256 contributions, uint256 matchAmount)',
  'event UnallocatedPoolReclaimed(address indexed operator, uint256 amount)',
]);
