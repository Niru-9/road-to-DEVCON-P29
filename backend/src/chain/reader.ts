import { createPublicClient, http, type Address, type Chain, type Hex, type PublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { qfAbi } from './abi.js';
import type { ChainRoundConfig } from '../domain/types.js';

export interface ChainClientOptions {
  chainId: number;
  rpcUrl: string;
}

export function createChainClient(options: ChainClientOptions): PublicClient {
  const chain: Chain =
    options.chainId === sepolia.id
      ? sepolia
      : {
          id: options.chainId,
          name: `chain-${options.chainId}`,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: [options.rpcUrl] } },
        };

  return createPublicClient({
    chain,
    transport: http(options.rpcUrl, {
      timeout: 20_000,
      retryCount: 2,
      retryDelay: 500,
    }),
  });
}

export async function readRoundConfig(
  client: PublicClient,
  address: Address,
): Promise<ChainRoundConfig> {
  const read = <T>(functionName: Parameters<typeof client.readContract>[0]['functionName']) =>
    client.readContract({ address, abi: qfAbi, functionName } as never) as Promise<T>;

  const [
    operator,
    startTime,
    endTime,
    matchingPool,
    totalContributions,
    totalScore,
    totalMatchAllocated,
    unallocatedPool,
    finalized,
    eligibilityRoot,
    projectCount,
  ] = await Promise.all([
    read<Address>('owner'),
    read<bigint>('startTime'),
    read<bigint>('endTime'),
    read<bigint>('matchingPool'),
    read<bigint>('totalContributions'),
    read<bigint>('totalScore'),
    read<bigint>('totalMatchAllocated'),
    read<bigint>('unallocatedPool'),
    read<boolean>('finalized'),
    read<Hex>('eligibilityRoot'),
    read<bigint>('projectCount'),
  ]);

  return {
    address,
    chainId: client.chain?.id ?? 0,
    operator,
    startTime: Number(startTime),
    endTime: Number(endTime),
    matchingPool,
    totalContributions,
    totalScore,
    totalMatchAllocated,
    unallocatedPool,
    finalized,
    eligibilityRoot,
    projectCount: Number(projectCount),
  };
}

export interface OnchainProject {
  projectId: number;
  payout: Address;
  name: string;
  metadataURI: string;
  contributions: bigint;
  matchAmount: bigint;
  withdrawn: boolean;
  score: bigint;
}

export async function readProject(
  client: PublicClient,
  address: Address,
  projectId: number,
): Promise<OnchainProject> {
  const [project, score] = await Promise.all([
    client.readContract({
      address,
      abi: qfAbi,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as Promise<{
      payout: Address;
      name: string;
      metadataURI: string;
      contributions: bigint;
      matchAmount: bigint;
      withdrawn: boolean;
    }>,
    client.readContract({
      address,
      abi: qfAbi,
      functionName: 'scoreOf',
      args: [BigInt(projectId)],
    }) as Promise<bigint>,
  ]);

  return {
    projectId,
    payout: project.payout,
    name: project.name,
    metadataURI: project.metadataURI,
    contributions: project.contributions,
    matchAmount: project.matchAmount,
    withdrawn: project.withdrawn,
    score,
  };
}

export async function readAllProjects(
  client: PublicClient,
  address: Address,
  projectCount: number,
): Promise<OnchainProject[]> {
  const ids = Array.from({ length: projectCount }, (_, index) => index);
  const projects: OnchainProject[] = [];
  // Small rounds: bounded concurrency keeps public RPCs happy.
  const batchSize = 5;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    projects.push(...(await Promise.all(batch.map((id) => readProject(client, address, id)))));
  }
  return projects;
}

export async function readNativeBalance(client: PublicClient, address: Address): Promise<bigint> {
  return client.getBalance({ address });
}

export async function readBlockNumber(client: PublicClient): Promise<number> {
  return Number(await client.getBlockNumber());
}
