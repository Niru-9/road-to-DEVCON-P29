import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, Copy, AlertCircle } from 'lucide-react';
import { Project } from '../types';
import { calculateQuadraticMatch } from '../utils/quadraticMath';
import { getMerkleProofForAddress } from '../utils/merkle';

interface QuadraticDrawerProps {
  project: Project | null;
  walletAddress: string;
  matchingPoolEth: number;
  onClose: () => void;
  onConfirmContribution: (projectId: number, amountEth: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  onSelectTestWallet?: (address: string) => void;
}

export const QuadraticDrawer: React.FC<QuadraticDrawerProps> = ({
  project,
  walletAddress,
  matchingPoolEth,
  onClose,
  onConfirmContribution,
  onSelectTestWallet
}) => {
  const [amount, setAmount] = useState<number>(0.05);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txSuccess, setTxSuccess] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>('');
  const [calldataCopied, setCalldataCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!project) return null;

  const currentAddress = walletAddress || '0x0d3477209913afFAF06CDe63Dd0F13f4C5728135';
  const proofResult = getMerkleProofForAddress(currentAddress, true);

  const {
    estimatedMultiplier,
    matchingPoolAdditionEth
  } = calculateQuadraticMatch(
    amount,
    project.contributions,
    matchingPoolEth
  );

  const handleContribute = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    const res = await onConfirmContribution(project.id, amount);
    setIsSubmitting(false);

    if (res.success) {
      setTxSuccess(true);
      setTxHash(res.txHash || '0x' + Math.random().toString(16).slice(2, 18));
      setTimeout(() => {
        setTxSuccess(false);
        onClose();
      }, 2500);
    } else {
      setErrorMessage(res.error || 'Transaction failed');
    }
  };

  const copyCalldata = () => {
    const proofHexArray = JSON.stringify(proofResult.proof);
    const text = `// contribute(${project.id}, ${proofHexArray})\n// Value: ${amount} ETH`;
    navigator.clipboard.writeText(text);
    setCalldataCopied(true);
    setTimeout(() => setCalldataCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-obsidian-card border-l border-obsidian-border h-full p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar shadow-2xl">
        
        {/* Top Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-obsidian-border pb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-pear" />
              <span className="text-sm font-semibold text-canvas tracking-wide">Quadratic Matching Allocation</span>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-full text-mist/60 hover:text-canvas hover:bg-obsidian-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase text-pear font-semibold tracking-wider">{project.category}</span>
              <span className="text-mist/40">•</span>
              <span className="text-xs font-mono text-mist/60">ID #{project.id}</span>
            </div>
            <h3 className="text-2xl font-serif text-canvas font-bold mt-1 leading-snug">{project.name}</h3>
            <p className="text-xs text-mist/75 mt-2 leading-relaxed">{project.description}</p>
          </div>

          {/* Preset Contribution Buttons */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-mist">
              <label>Select Contribution (ETH)</label>
              <span className="text-[11px] text-pear font-mono">Micro-donations beat whales</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0.01, 0.05, 0.1, 0.5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                    amount === val
                      ? 'bg-cornflower text-obsidian-deep border-cornflower shadow-glow-cornflower'
                      : 'bg-obsidian-surface border-obsidian-border text-canvas hover:border-mist/30'
                  }`}
                >
                  {val} ETH
                </button>
              ))}
            </div>

            <div className="relative mt-2">
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(Math.max(0.001, parseFloat(e.target.value) || 0))}
                className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-2.5 text-sm font-mono text-canvas outline-none focus:border-cornflower transition-colors"
              />
              <span className="absolute right-4 top-2.5 text-xs text-mist/60 font-semibold font-sans">ETH</span>
            </div>
          </div>

          {/* Dynamic QF Multiplier Card (from reference mockup) */}
          <div className="bg-gradient-to-br from-cornflower-muted to-pear-muted border border-cornflower/30 rounded-2xl p-5 space-y-3.5 backdrop-blur-md">
            <div className="flex justify-between items-center text-xs">
              <span className="text-mist font-medium">Estimated Quadratic Multiplier:</span>
              <span className="text-pear font-bold text-sm tracking-wide font-mono">+{estimatedMultiplier}x Impact</span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2.5">
              <span className="text-mist font-medium">Matching Pool Addition:</span>
              <span className="text-canvas font-mono font-bold text-sm">~{matchingPoolAdditionEth} ETH</span>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2.5">
              <span className="text-mist font-medium">Total Project Impact:</span>
              <span className="text-emerald-400 font-mono font-bold">~{(amount + matchingPoolAdditionEth).toFixed(4)} ETH</span>
            </div>

            <div className="text-[10px] text-mist/60 text-center pt-1 font-mono">
              formula: (Σ √c_i)² scaled to {matchingPoolEth} ETH pool
            </div>
          </div>

          {/* Attendee Merkle Proof Status */}
          <div className="p-3.5 rounded-xl bg-obsidian-surface/80 border border-obsidian-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-mist/70">Road to Devcon Attendee Pass:</span>
              {proofResult.isEligible ? (
                <span className="inline-flex items-center text-emerald-400 font-semibold text-[11px] gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Eligible ({proofResult.label || 'Verified'})</span>
                </span>
              ) : (
                <span className="inline-flex items-center text-amber-400 font-semibold text-[11px] gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Not In Allowlist</span>
                </span>
              )}
            </div>

            {!proofResult.isEligible && onSelectTestWallet && (
              <div className="text-[11px] text-mist/70 pt-1 border-t border-white/5 flex items-center justify-between">
                <span>Want to test eligibility?</span>
                <button
                  onClick={() => onSelectTestWallet('0x0d3477209913afFAF06CDe63Dd0F13f4C5728135')}
                  className="text-pear hover:underline font-semibold"
                >
                  Use Arjun&apos;s Verified Wallet
                </button>
              </div>
            )}
          </div>

          {/* Error notice if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success notice */}
          {txSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Contribution Confirmed!</span>
              </div>
              <div className="font-mono text-[10px] break-all text-emerald-200/80">Tx: {txHash}</div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 space-y-3 border-t border-obsidian-border">
          <button
            onClick={handleContribute}
            disabled={isSubmitting || txSuccess}
            className="w-full py-4 rounded-2xl bg-pear hover:bg-pear-hover disabled:opacity-50 text-obsidian-deep font-bold text-xs tracking-wider uppercase transition-all shadow-glow-pear flex items-center justify-center space-x-2 active:scale-98"
          >
            {isSubmitting ? (
              <span>Dispatching Onchain...</span>
            ) : txSuccess ? (
              <span>Success! Recorded Onchain</span>
            ) : (
              <>
                <span>Confirm Contribution ({amount} ETH)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={copyCalldata}
            className="w-full py-2.5 rounded-xl border border-obsidian-border text-mist/70 hover:text-canvas hover:border-mist/30 text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <Copy className="w-3.5 h-3.5 text-cornflower" />
            <span>{calldataCopied ? 'Calldata Copied to Clipboard!' : 'Copy Remix / Cast Calldata'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
