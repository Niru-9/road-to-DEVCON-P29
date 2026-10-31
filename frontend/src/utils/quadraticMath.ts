import { parseEther, formatEther } from 'viem';

export const WAD = 10n ** 18n;

/**
 * Floor integer square root (identical to OpenZeppelin Math.sqrt and EVM uint256).
 */
export function isqrt(value: bigint): bigint {
  if (value < 0n) throw new RangeError('isqrt is undefined for negative values');
  if (value < 2n) return value;

  let x0 = value;
  let x1 = (x0 + 1n) >> 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) >> 1n;
  }
  return x0;
}

/**
 * Full-precision floor(score * pool / totalScore), identical to Math.mulDiv on-chain.
 */
export function scaleToPool(score: bigint, pool: bigint, totalScore: bigint): bigint {
  if (score < 0n || pool < 0n || totalScore < 0n) {
    throw new RangeError('scaleToPool only accepts non-negative values');
  }
  if (totalScore === 0n) return 0n;
  return (score * pool) / totalScore;
}

export interface QuadraticImpactResult {
  amountEth: number;
  amountWei: bigint;
  oldScoreWei: bigint;
  newScoreWei: bigint;
  scoreDeltaWei: bigint;
  matchingPoolAdditionEth: number;
  matchingPoolAdditionWei: bigint;
  estimatedMultiplier: number;
}

/**
 * Calculates user's quadratic matching impact given existing project contributions
 * and the matching pool size.
 */
export function calculateQuadraticMatch(
  newAmountEth: number,
  existingContributionsEth: number[],
  poolEth: number = 100.0,
  otherProjectsTotalScoreWei: bigint = 500000000000000000000n // baseline representation
): QuadraticImpactResult {
  const safeAmount = Math.max(0.0001, newAmountEth);
  const newAmountWei = parseEther(safeAmount.toString());
  const poolWei = parseEther(poolEth.toString());

  // Existing contributions
  let oldSumSqrtWei = 0n;
  for (const c of existingContributionsEth) {
    if (c > 0) {
      const cWei = parseEther(c.toString());
      oldSumSqrtWei += isqrt(cWei);
    }
  }
  const oldScoreWei = oldSumSqrtWei * oldSumSqrtWei;

  // New contributions including current contributor
  const newSumSqrtWei = oldSumSqrtWei + isqrt(newAmountWei);
  const newScoreWei = newSumSqrtWei * newSumSqrtWei;
  const scoreDeltaWei = newScoreWei - oldScoreWei;

  // Pool allocation comparison
  const oldTotalScore = otherProjectsTotalScoreWei + oldScoreWei;
  const newTotalScore = otherProjectsTotalScoreWei + newScoreWei;

  const oldMatchWei = scaleToPool(oldScoreWei, poolWei, oldTotalScore);
  const newMatchWei = scaleToPool(newScoreWei, poolWei, newTotalScore);
  const matchingPoolAdditionWei = newMatchWei > oldMatchWei ? newMatchWei - oldMatchWei : 0n;

  const matchingAdditionEth = Number(formatEther(matchingPoolAdditionWei));
  const estimatedMultiplier = safeAmount > 0 
    ? Number(((matchingAdditionEth + safeAmount) / safeAmount).toFixed(1))
    : 1.0;

  return {
    amountEth: safeAmount,
    amountWei: newAmountWei,
    oldScoreWei,
    newScoreWei,
    scoreDeltaWei,
    matchingPoolAdditionEth: Number(matchingAdditionEth.toFixed(4)),
    matchingPoolAdditionWei,
    estimatedMultiplier
  };
}

/**
 * Works out the iconic worked example from README:
 * 200 people contributing 0.01 ETH each vs 1 whale contributing 100 ETH.
 */
export function getBreadthVsWhaleExample(poolEth: number = 100) {
  const poolWei = parseEther(poolEth.toString());

  // 200 small contributors of 0.01 ETH each = 2 ETH total
  const smallBackerCount = 200;
  const smallBackerAmountWei = parseEther('0.01');
  const smallBackerSqrtWei = isqrt(smallBackerAmountWei);
  const crowdSumSqrtWei = BigInt(smallBackerCount) * smallBackerSqrtWei;
  const crowdScoreWei = crowdSumSqrtWei * crowdSumSqrtWei;

  // 1 whale of 100 ETH
  const whaleAmountWei = parseEther('100.0');
  const whaleSumSqrtWei = isqrt(whaleAmountWei);
  const whaleScoreWei = whaleSumSqrtWei * whaleSumSqrtWei;

  const totalScoreWei = crowdScoreWei + whaleScoreWei;
  const crowdMatchWei = scaleToPool(crowdScoreWei, poolWei, totalScoreWei);
  const whaleMatchWei = scaleToPool(whaleScoreWei, poolWei, totalScoreWei);

  return {
    crowd: {
      backers: 200,
      totalContributedEth: 2.0,
      score: crowdScoreWei.toString(),
      matchEth: Number(formatEther(crowdMatchWei)),
      matchSharePercent: 80.0
    },
    whale: {
      backers: 1,
      totalContributedEth: 100.0,
      score: whaleScoreWei.toString(),
      matchEth: Number(formatEther(whaleMatchWei)),
      matchSharePercent: 20.0
    },
    ratio: '4:1'
  };
}
