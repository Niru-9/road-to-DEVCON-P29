import React, { useState } from 'react';
import { Wallet, ShieldCheck, CheckCircle2, AlertCircle, Copy, ArrowRight } from 'lucide-react';
import { Project, RoundSummary } from '../types';
import { CONTRACT_ADDRESS } from '../config/contracts';

interface WithdrawPageProps {
  projects: Project[];
  summary: RoundSummary;
  walletConnected?: boolean;
  walletAddress: string;
  onSelectTestWallet: (address: string) => void;
}

export const WithdrawPage: React.FC<WithdrawPageProps> = ({
  projects,
  summary,
  walletAddress,
  onSelectTestWallet
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [txSuccess, setTxSuccess] = useState<boolean>(false);
  const [calldataCopied, setCalldataCopied] = useState<boolean>(false);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const isCallerPayout = walletAddress.toLowerCase() === activeProject.payout.toLowerCase();
  const isEligibleToWithdraw = summary.finalized && isCallerPayout && !activeProject.withdrawn;

  const totalClaimable = activeProject.contributionsEth + activeProject.matchEth;

  const handleWithdraw = () => {
    setTxSuccess(true);
    setTimeout(() => {
      setTxSuccess(false);
      activeProject.withdrawn = true;
    }, 2000);
  };

  const copyCalldata = () => {
    const text = `// withdraw(${activeProject.id})\n// Target: ${CONTRACT_ADDRESS}`;
    navigator.clipboard.writeText(text);
    setCalldataCopied(true);
    setTimeout(() => setCalldataCopied(false), 2000);
  };

  return (
    <div className="py-12 px-6 sm:px-10 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-pear bg-obsidian-card px-3.5 py-1 rounded-full border border-obsidian-border">
          <Wallet className="w-3.5 h-3.5" />
          <span>Project Lead Claim & Payout Portal</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif text-canvas tracking-tight">
          PROJECT WITHDRAWAL
        </h1>
        <p className="text-mist/75 text-sm sm:text-base max-w-2xl leading-relaxed">
          Approved grassroots initiatives withdraw their pooled community contributions plus their allocated matching share. Withdrawals are single-claim and protected against reentrancy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Project Selector & Status */}
        <div className="lg:col-span-7 bg-obsidian-card p-6 sm:p-8 rounded-3xl border border-obsidian-border space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-mist uppercase tracking-wider">
              Select Your Registered Initiative
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(Number(e.target.value))}
              className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-3 text-sm text-canvas outline-none focus:border-cornflower font-medium"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project #{p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Details Card */}
          <div className="p-5 rounded-2xl bg-obsidian-surface border border-obsidian-border space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-xs uppercase text-pear font-semibold">{activeProject.category}</span>
                <h3 className="text-lg font-bold text-canvas mt-0.5">{activeProject.name}</h3>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                activeProject.withdrawn
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-cornflower/20 text-cornflower'
              }`}>
                {activeProject.withdrawn ? 'Already Withdrawn' : 'Unclaimed'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-white/5 font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-mist/60 text-[10px] block">Direct Contributions</span>
                <span className="text-canvas font-bold text-sm">{activeProject.contributionsEth} ETH</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-mist/60 text-[10px] block">Matching Pool Share</span>
                <span className="text-pear font-bold text-sm">+{activeProject.matchEth} ETH</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-mist/60 text-[10px] block">Total Claimable</span>
                <span className="text-emerald-400 font-bold text-sm">{totalClaimable.toFixed(3)} ETH</span>
              </div>
            </div>

            <div className="text-xs font-mono text-mist/60 pt-1">
              Registered Payout Address: <span className="text-canvas">{activeProject.payout}</span>
            </div>
          </div>

          {/* Payout Identity Validation */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-mist uppercase tracking-wider">
              Payout Wallet Identity Check
            </div>

            {isCallerPayout ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Connected wallet matches the registered payout address for this initiative!</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Wallet Mismatch: Only the registered payout address can withdraw.</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-500/20">
                  <span>Testing withdrawal?</span>
                  <button
                    onClick={() => onSelectTestWallet(activeProject.payout)}
                    className="text-pear hover:underline font-bold"
                  >
                    Switch to {activeProject.payout.slice(0, 8)}...
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <div className="pt-2 space-y-3">
            <button
              onClick={handleWithdraw}
              disabled={activeProject.withdrawn || !isEligibleToWithdraw}
              className="w-full py-4 rounded-2xl bg-pear hover:bg-pear-hover disabled:opacity-40 text-obsidian-deep font-bold text-xs tracking-wider uppercase transition-all shadow-glow-pear flex items-center justify-center space-x-2"
            >
              {activeProject.withdrawn ? (
                <span>Funds Already Withdrawn</span>
              ) : !isEligibleToWithdraw ? (
                <span>Eligible Payout Address Required</span>
              ) : txSuccess ? (
                <span>Withdrawal Confirmed on Sepolia!</span>
              ) : (
                <>
                  <span>Claim Full Payout ({totalClaimable.toFixed(3)} ETH)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={copyCalldata}
              className="w-full py-2.5 rounded-xl border border-obsidian-border text-mist hover:text-canvas text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="w-3.5 h-3.5 text-cornflower" />
              <span>{calldataCopied ? 'Calldata Copied!' : 'Copy Remix withdraw() Calldata'}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Invariant Specs */}
        <div className="lg:col-span-5 bg-obsidian-card p-6 sm:p-8 rounded-3xl border border-obsidian-border space-y-6">
          <h3 className="text-lg font-bold text-canvas flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-pear" />
            <span>Withdrawal Security Invariants</span>
          </h3>

          <div className="space-y-4 text-xs text-mist/80 leading-relaxed">
            <div className="p-4 rounded-xl bg-obsidian-surface border border-obsidian-border space-y-1">
              <span className="font-bold text-canvas block">1. Checks-Effects-Interactions</span>
              <p>
                In <code className="text-pear">withdraw(projectId)</code>, the contract sets <code className="text-pear">project.withdrawn = true</code> before issuing the external ETH transfer. Reentrant calls immediately revert.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-obsidian-surface border border-obsidian-border space-y-1">
              <span className="font-bold text-canvas block">2. Single Claim Guarantee</span>
              <p>
                Once funds are claimed, subsequent attempts revert with <code className="text-pear">AlreadyWithdrawn()</code>, making double payouts mathematically impossible.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-obsidian-surface border border-obsidian-border space-y-1">
              <span className="font-bold text-canvas block">3. Time Window Enforcement</span>
              <p>
                Withdrawals can only occur after the round end timestamp is exceeded and <code className="text-pear">finalize()</code> has locked the scores.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
