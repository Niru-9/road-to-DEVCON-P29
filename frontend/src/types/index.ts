export interface Project {
  id: number;
  payout: string;
  name: string;
  category: 'Vernacular Docs' | 'Developer Education' | 'Student Clubs' | 'Regional Ecosystem' | 'DeFi Tooling';
  tag: string;
  description: string;
  metadataURI: string;
  contributionsWei: bigint;
  contributionsEth: number;
  matchWei: bigint;
  matchEth: number;
  scoreWei: bigint;
  targetEth: number;
  contributorCount: number;
  withdrawn: boolean;
  gradientClass: string;
  contributions: number[];
}

export interface RoundSummary {
  address: string;
  chainId: number;
  name: string;
  operator: string;
  startTime: number;
  endTime: number;
  matchingPoolWei: bigint;
  matchingPoolEth: number;
  totalContributionsWei: bigint;
  totalContributionsEth: number;
  totalScore: bigint;
  totalMatchAllocatedWei: bigint;
  totalVoters: number;
  finalized: boolean;
  eligibilityRoot: string;
  projectCount: number;
}

export interface ContributorDetail {
  address: string;
  amountWei: string;
  amountEth: number;
  sqrtWei: string;
  scoreSharePercent: number;
}

export interface ProjectAuditResult {
  id: number;
  name: string;
  payout: string;
  category: string;
  contributorCount: number;
  totalContributedEth: number;
  sumSqrtWei: string;
  quadraticScore: string;
  matchingEth: number;
  totalPayoutEth: number;
  status: 'Active' | 'Finalized' | 'Withdrawn';
  withdrawn: boolean;
  contributors: ContributorDetail[];
}

export interface MerkleProofResult {
  address: string;
  isEligible: boolean;
  leaf: string;
  proof: string[];
  label?: string;
  source?: string;
}

export type NavigationPage = 'home' | 'rounds' | 'results' | 'eligibility' | 'withdraw' | 'operator';
