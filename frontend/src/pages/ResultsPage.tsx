import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  Layers, 
  Scale, 
  Code2, 
  ExternalLink 
} from 'lucide-react';
import { Project, RoundSummary } from '../types';
import { getBreadthVsWhaleExample } from '../utils/quadraticMath';
import { CONTRACT_ADDRESS } from '../config/contracts';

interface ResultsPageProps {
  projects: Project[];
  summary: RoundSummary;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ projects, summary }) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'whaleSimulator' | 'integrity'>('audit');

  // Breadth vs Whale benchmark simulation
  const whaleComparison = getBreadthVsWhaleExample(summary.matchingPoolEth);

  const exportResultsCSV = () => {
    const headers = ['Project ID', 'Project Name', 'Payout Address', 'Contributors', 'Contributions (ETH)', 'Score', 'Match Allocated (ETH)', 'Total Payout (ETH)', 'Withdrawn'];
    const rows = projects.map(p => [
      p.id,
      `"${p.name}"`,
      p.payout,
      p.contributorCount,
      p.contributionsEth,
      p.scoreWei.toString(),
      p.matchEth,
      (p.contributionsEth + p.matchEth).toFixed(3),
      p.withdrawn ? 'true' : 'false'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'devcon-round-results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-12 px-6 sm:px-10 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-pear bg-obsidian-card px-3.5 py-1 rounded-full border border-obsidian-border">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Independent Verifiable Results Engine</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif text-canvas tracking-tight">
            VERIFIABLE AUDIT & RESULTS
          </h1>
          <p className="text-mist/75 text-sm sm:text-base max-w-2xl leading-relaxed">
            Every project lead can verify their exact quadratic score, verify the square-root math, and independently validate that matches never exceed the sponsor pool.
          </p>
        </div>

        <button
          onClick={exportResultsCSV}
          className="flex items-center space-x-2 bg-obsidian-card hover:bg-obsidian-surface border border-obsidian-border text-canvas px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-pear" />
          <span>Export Results (CSV)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-obsidian-border gap-4 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-pear text-pear'
              : 'border-transparent text-mist/60 hover:text-canvas'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Project Allocation Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('whaleSimulator')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'whaleSimulator'
              ? 'border-pear text-pear'
              : 'border-transparent text-mist/60 hover:text-canvas'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Breadth vs Whale Proof (4:1)</span>
        </button>

        <button
          onClick={() => setActiveTab('integrity')}
          className={`pb-3 px-2 border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'integrity'
              ? 'border-pear text-pear'
              : 'border-transparent text-mist/60 hover:text-canvas'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>On-Chain Invariants & Proofs</span>
        </button>
      </div>

      {/* Tab 1: Project Allocation Ledger */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl border border-obsidian-border bg-obsidian-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-obsidian-surface/80 border-b border-obsidian-border text-[11px] uppercase tracking-wider text-mist/60 font-mono">
                <tr>
                  <th className="py-4 px-4 sm:px-6">Project</th>
                  <th className="py-4 px-3">Backers</th>
                  <th className="py-4 px-3">Contributed</th>
                  <th className="py-4 px-3">Score (Σ√c)²</th>
                  <th className="py-4 px-3 text-pear">Allocated Match</th>
                  <th className="py-4 px-3 text-canvas font-bold">Total Payout</th>
                  <th className="py-4 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border text-xs">
                {projects.map((p) => {
                  const totalPayout = p.contributionsEth + p.matchEth;
                  return (
                    <tr key={p.id} className="hover:bg-obsidian-surface/40 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-canvas">{p.name}</div>
                        <div className="text-[11px] font-mono text-mist/50 mt-0.5">
                          ID #{p.id} • Payout: {p.payout.slice(0, 6)}...{p.payout.slice(-4)}
                        </div>
                      </td>
                      <td className="py-4 px-3 font-semibold text-mist">
                        {p.contributorCount} attendees
                      </td>
                      <td className="py-4 px-3 font-mono text-canvas">
                        {p.contributionsEth} ETH
                      </td>
                      <td className="py-4 px-3 font-mono text-mist/80">
                        {p.scoreWei > 0n ? (p.scoreWei / (10n ** 18n)).toString() + ' pts' : '0 pts'}
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-pear">
                        +{p.matchEth} ETH
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-canvas text-sm">
                        {totalPayout.toFixed(3)} ETH
                      </td>
                      <td className="py-4 px-4 text-center">
                        {p.withdrawn ? (
                          <span className="text-[11px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-semibold">
                            Withdrawn
                          </span>
                        ) : summary.finalized ? (
                          <span className="text-[11px] bg-pear/20 text-pear px-2.5 py-1 rounded-full font-semibold">
                            Ready to Claim
                          </span>
                        ) : (
                          <span className="text-[11px] bg-cornflower/15 text-cornflower px-2.5 py-1 rounded-full font-semibold">
                            Round Active (Preview)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-surface/60 border border-obsidian-border text-xs text-mist/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>
              Matches before <code className="text-pear">finalize()</code> are real-time mathematical previews. After Nov 06, 2026, amounts become immutable claims onchain.
            </span>
            <a
              href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cornflower hover:underline flex items-center gap-1 font-semibold shrink-0"
            >
              <span>View On Sepolia</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Tab 2: Breadth vs Whale Proof */}
      {activeTab === 'whaleSimulator' && (
        <div className="space-y-8 bg-obsidian-card p-6 sm:p-8 rounded-3xl border border-obsidian-border">
          <div className="max-w-2xl space-y-2">
            <h3 className="text-2xl font-serif text-canvas">The Proof: Two Hundred Small Backers Beat One Whale</h3>
            <p className="text-xs sm:text-sm text-mist/80 leading-relaxed">
              In quadratic funding, 200 grassroots community members contributing 0.01 ETH each (2 ETH total) score vastly higher than 1 whale depositing 100 ETH. Here is the exact EVM integer math:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* The Crowd Card */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-pear/30 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-bold text-pear tracking-wider">Grassroots Community</span>
                <span className="text-xs bg-pear/20 text-pear px-2.5 py-0.5 rounded-full font-mono font-bold">{whaleComparison.crowd.matchSharePercent}% of Pool</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold font-serif text-canvas">{whaleComparison.crowd.backers} Backers</div>
                <div className="text-xs text-mist/70">0.01 ETH each = {whaleComparison.crowd.totalContributedEth} ETH Total Contributed</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-mist/80">
                  <span>Sum of √c:</span>
                  <span className="text-canvas">200 × √(10¹⁶) = 2×10¹⁰</span>
                </div>
                <div className="flex justify-between text-mist/80">
                  <span>Quadratic Score:</span>
                  <span className="text-pear font-bold">(2×10¹⁰)² = 4×10²⁰</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 text-canvas font-bold">
                  <span>{summary.matchingPoolEth} ETH Pool Match:</span>
                  <span className="text-pear text-sm">{whaleComparison.crowd.matchEth} ETH</span>
                </div>
              </div>
            </div>

            {/* The Whale Card */}
            <div className="p-6 rounded-2xl bg-obsidian-surface border border-obsidian-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-bold text-mist/60 tracking-wider">Single Whale</span>
                <span className="text-xs bg-mist/10 text-mist/80 px-2.5 py-0.5 rounded-full font-mono font-bold">{whaleComparison.whale.matchSharePercent}% of Pool</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold font-serif text-canvas">{whaleComparison.whale.backers} Backer</div>
                <div className="text-xs text-mist/70">{whaleComparison.whale.totalContributedEth} ETH Total Contributed</div>
              </div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-mist/80">
                  <span>Sum of √c:</span>
                  <span className="text-canvas">1 × √(10²⁰) = 10¹⁰</span>
                </div>
                <div className="flex justify-between text-mist/80">
                  <span>Quadratic Score:</span>
                  <span className="text-canvas font-bold">(10¹⁰)² = 1×10²⁰</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 text-canvas font-bold">
                  <span>{summary.matchingPoolEth} ETH Pool Match:</span>
                  <span className="text-mist text-sm">{whaleComparison.whale.matchEth} ETH</span>
                </div>
              </div>
            </div>

          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-r from-pear-muted to-cornflower-muted border border-pear/30 text-center space-y-1">
            <span className="text-xs uppercase font-bold text-pear tracking-widest">Mathematical Advantage</span>
            <div className="text-2xl sm:text-3xl font-serif text-canvas font-bold">
              Breadth Wins 4 : 1 Over Whale Capital
            </div>
            <p className="text-xs text-mist/80 max-w-lg mx-auto pt-1">
              The crowd put up 50× less money, yet captured 4× more of the matching pool.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: On-Chain Invariants & Proofs */}
      {activeTab === 'integrity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Score Formula: (Σ√c)²</span>
              </div>
              <p className="text-xs text-mist/80 leading-relaxed">
                OpenZeppelin <code className="text-pear">Math.sqrt</code> is computed per contributor before squaring. Verified by Foundry acceptance test suite.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pool Capping Invariant</span>
              </div>
              <p className="text-xs text-mist/80 leading-relaxed">
                Uses 512-bit <code className="text-pear">Math.mulDiv(score, pool, totalScore)</code> with floor rounding. Total matches can never exceed the pool balance.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Merkle Attendee Allowlist</span>
              </div>
              <p className="text-xs text-mist/80 leading-relaxed">
                Only verified Road to Devcon attendees in root <code className="text-pear">{summary.eligibilityRoot.slice(0, 10)}...</code> can contribute onchain.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Single Non-Reentrant Withdrawal</span>
              </div>
              <p className="text-xs text-mist/80 leading-relaxed">
                Projects withdraw contributions plus match exactly once. State flag is set before ETH transfer with checks-effects-interactions.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
