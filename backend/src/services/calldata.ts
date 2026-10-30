import { encodeFunctionData, type Address, type Hex } from 'viem';
import { qfAbi } from '../chain/abi.js';
import type { RoundRow } from '../domain/types.js';

export interface TransactionRequest {
  chainId: number;
  to: Address;
  from?: Address;
  data: Hex;
  value: string;
  description: string;
  /** Human-readable reminder that this transaction must be submitted by the right signer. */
  submittedBy: 'operator' | 'project-payout' | 'anyone';
}

function tx(
  round: RoundRow,
  data: Hex,
  value: bigint,
  description: string,
  submittedBy: TransactionRequest['submittedBy'],
): TransactionRequest {
  return {
    chainId: round.chain_id,
    to: round.address,
    data,
    value: value.toString(),
    description,
    submittedBy,
  };
}

export function buildSetEligibilityRootTx(round: RoundRow, root: Hex): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({ abi: qfAbi, functionName: 'setEligibilityRoot', args: [root] }),
    0n,
    'Publish the eligibility Merkle root on-chain. Must be signed by the round operator before the round ends.',
    'operator',
  );
}

export function buildRegisterProjectTx(
  round: RoundRow,
  payout: Address,
  name: string,
  metadataUri: string,
): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({
      abi: qfAbi,
      functionName: 'registerProject',
      args: [payout, name, metadataUri],
    }),
    0n,
    `Register "${name}" with payout address ${payout}. Must be signed by the round operator before the round ends.`,
    'operator',
  );
}

export function buildFundPoolTx(round: RoundRow, amountWei: bigint): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({ abi: qfAbi, functionName: 'fundPool' }),
    amountWei,
    'Add ETH to the matching pool. Must be signed by the round operator before the round ends.',
    'operator',
  );
}

export function buildFinalizeTx(round: RoundRow): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({ abi: qfAbi, functionName: 'finalize' }),
    0n,
    'Finalize the round after endTime. Anyone can submit this transaction; it only stores the deterministic result.',
    'anyone',
  );
}

export function buildWithdrawTx(round: RoundRow, projectId: number): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({ abi: qfAbi, functionName: 'withdraw', args: [BigInt(projectId)] }),
    0n,
    `Withdraw project ${projectId}'s contributions plus match. Must be signed by that project's payout address.`,
    'project-payout',
  );
}

export function buildReclaimUnallocatedTx(round: RoundRow): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({ abi: qfAbi, functionName: 'reclaimUnallocatedPool' }),
    0n,
    'Return rounding dust that was not allocated to any project. Must be signed by the round operator after finalization.',
    'operator',
  );
}

export function buildContributeTx(
  round: RoundRow,
  projectId: number,
  proof: Hex[],
  amountWei: bigint,
): TransactionRequest {
  return tx(
    round,
    encodeFunctionData({
      abi: qfAbi,
      functionName: 'contribute',
      args: [BigInt(projectId), proof],
    }),
    amountWei,
    `Contribute to project ${projectId}. Must be signed by the eligible contributor.`,
    'anyone',
  );
}
