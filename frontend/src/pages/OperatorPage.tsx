import React, { useState } from 'react';
import { 
  Shield, 
  PlusCircle, 
  Coins, 
  GitBranch, 
  CheckCircle2, 
  Clock, 
  Copy, 
  AlertTriangle,
  Lock 
} from 'lucide-react';
import { RoundSummary, Project } from '../types';
import { CONTRACT_ADDRESS, OPERATOR_ADDRESS } from '../config/contracts';

interface OperatorPageProps {
  summary: RoundSummary;
  projects: Project[];
  walletAddress: string;
  onSelectTestWallet: (address: string) => void;
}

export const OperatorPage: React.FC<OperatorPageProps> = ({
  summary,
  projects,
  walletAddress,
  onSelectTestWallet
}) => {
  const [activeAction, setActiveAction] = useState<'fund' | 'register' | 'root' | 'finalize'>('fund');
  
  // Forms state
  const [fundAmount, setFundAmount] = useState<string>('1.0');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectPayout, setNewProjectPayout] = useState<string>('');
  const [newProjectURI, setNewProjectURI] = useState<string>('');
  const [newRoot, setNewRoot] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');

  const isOperator = walletAddress.toLowerCase() === OPERATOR_ADDRESS.toLowerCase();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const simulateSuccess = (message: string) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(''), 3000);
  };

  return (
    <div className="py-12 px-6 sm:px-10 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-pear bg-obsidian-card px-3.5 py-1 rounded-full border border-obsidian-border">
          <Shield className="w-3.5 h-3.5 text-pear" />
          <span>Round Operator Management Console</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif text-canvas tracking-tight">
          OPERATOR CONTROLS
        </h1>
        <p className="text-mist/75 text-sm sm:text-base max-w-2xl leading-relaxed">
          Administrative actions for Arjun: register grassroots projects, top up the sponsor matching pool, update the attendee Merkle root, and finalize the round after the deadline.
        </p>
      </div>

      {/* Operator Role Verification */}
      {!isOperator && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Connected wallet ({walletAddress ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4) : 'None'}) is not the deployed round owner (<span className="font-mono">{OPERATOR_ADDRESS.slice(0, 6)}...{OPERATOR_ADDRESS.slice(-4)}</span>).
            </span>
          </div>
          <button
            onClick={() => onSelectTestWallet(OPERATOR_ADDRESS)}
            className="px-4 py-2 rounded-xl bg-pear text-obsidian-deep font-bold text-xs shrink-0 shadow-sm"
          >
            Switch to Arjun (Operator)
          </button>
        </div>
      )}

      {/* Contract Parameter Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-1">
          <span className="text-[10px] uppercase font-semibold text-mist/60 block">Contract Address</span>
          <div className="font-mono text-xs text-canvas truncate">{CONTRACT_ADDRESS}</div>
        </div>

        <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-1">
          <span className="text-[10px] uppercase font-semibold text-mist/60 block">Operator (Arjun)</span>
          <div className="font-mono text-xs text-pear truncate">{OPERATOR_ADDRESS}</div>
        </div>

        <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-1">
          <span className="text-[10px] uppercase font-semibold text-mist/60 block">Round Window</span>
          <div className="text-xs text-canvas font-medium">Oct 30 – Nov 06, 2026</div>
        </div>

        <div className="p-5 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-1">
          <span className="text-[10px] uppercase font-semibold text-mist/60 block">Onchain Pool Balance</span>
          <div className="font-mono text-xs text-emerald-400 font-bold">{summary.matchingPoolWei.toString()} wei (additive)</div>
        </div>
      </div>

      {/* Action Tabs and Interface */}
      <div className="bg-obsidian-card p-6 sm:p-8 rounded-3xl border border-obsidian-border space-y-6">
        
        {/* Sub-navigation */}
        <div className="flex flex-wrap gap-2 border-b border-obsidian-border pb-4">
          <button
            onClick={() => setActiveAction('fund')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeAction === 'fund'
                ? 'bg-pear text-obsidian-deep font-bold'
                : 'bg-obsidian-surface text-mist hover:text-canvas'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Fund Pool</span>
          </button>

          <button
            onClick={() => setActiveAction('register')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeAction === 'register'
                ? 'bg-pear text-obsidian-deep font-bold'
                : 'bg-obsidian-surface text-mist hover:text-canvas'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Project</span>
          </button>

          <button
            onClick={() => setActiveAction('root')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeAction === 'root'
                ? 'bg-pear text-obsidian-deep font-bold'
                : 'bg-obsidian-surface text-mist hover:text-canvas'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Update Merkle Root</span>
          </button>

          <button
            onClick={() => setActiveAction('finalize')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeAction === 'finalize'
                ? 'bg-pear text-obsidian-deep font-bold'
                : 'bg-obsidian-surface text-mist hover:text-canvas'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Finalize Round</span>
          </button>
        </div>

        {/* Action Success Banner */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 1. Fund Pool */}
        {activeAction === 'fund' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-lg font-bold text-canvas">Top Up Sponsor Matching Pool</h3>
              <p className="text-xs text-mist/75 mt-0.5">
                <code className="text-pear">fundPool()</code> is additive and callable only before <code className="text-pear">endTime</code>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-mist">Amount to Deposit (ETH)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-3 text-sm font-mono text-canvas outline-none focus:border-cornflower"
                />
                <span className="absolute right-4 top-3 text-xs text-mist/60 font-semibold">ETH</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => simulateSuccess(`Submitted fundPool() with ${fundAmount} ETH!`)}
                className="flex-1 py-3 rounded-xl bg-pear hover:bg-pear-hover text-obsidian-deep font-bold text-xs uppercase tracking-wider transition-all"
              >
                Send fundPool() Transaction
              </button>
              <button
                onClick={() => handleCopy(`// fundPool() with value ${fundAmount} ETH\n// Target: ${CONTRACT_ADDRESS}`, 'fund')}
                className="px-5 py-3 rounded-xl border border-obsidian-border hover:bg-obsidian-surface text-mist text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-cornflower" />
                <span>{copiedText === 'fund' ? 'Copied!' : 'Copy Calldata'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. Register Project */}
        {activeAction === 'register' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-lg font-bold text-canvas">Register Grassroots Project</h3>
              <p className="text-xs text-mist/75 mt-0.5">
                Only the operator can register. Each project receives an incremental ID starting from 0.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-mist block mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Malayalam Smart Contract Dev Camp"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-2.5 text-canvas outline-none focus:border-cornflower"
                />
              </div>

              <div>
                <label className="font-semibold text-mist block mb-1">Payout Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newProjectPayout}
                  onChange={(e) => setNewProjectPayout(e.target.value)}
                  className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-2.5 font-mono text-canvas outline-none focus:border-cornflower"
                />
              </div>

              <div>
                <label className="font-semibold text-mist block mb-1">Metadata URI</label>
                <input
                  type="text"
                  placeholder="ipfs://bafy... or '' ''"
                  value={newProjectURI}
                  onChange={(e) => setNewProjectURI(e.target.value)}
                  className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-2.5 font-mono text-canvas outline-none focus:border-cornflower"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => simulateSuccess(`Project "${newProjectName || 'New Initiative'}" registered with ID #${projects.length}!`)}
                className="flex-1 py-3 rounded-xl bg-pear hover:bg-pear-hover text-obsidian-deep font-bold text-xs uppercase tracking-wider transition-all"
              >
                Register Project Onchain
              </button>
              <button
                onClick={() => handleCopy(`// registerProject("${newProjectPayout}", "${newProjectName}", "${newProjectURI}")`, 'reg')}
                className="px-5 py-3 rounded-xl border border-obsidian-border hover:bg-obsidian-surface text-mist text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-cornflower" />
                <span>{copiedText === 'reg' ? 'Copied!' : 'Copy Calldata'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. Update Merkle Root */}
        {activeAction === 'root' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-lg font-bold text-canvas">Update Attendee Merkle Root</h3>
              <p className="text-xs text-mist/75 mt-0.5">
                Can be updated until round ends to onboard late-verified Road to Devcon attendees.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-mist">New bytes32 Merkle Root</label>
              <input
                type="text"
                placeholder="0x8cb9..."
                value={newRoot}
                onChange={(e) => setNewRoot(e.target.value)}
                className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl px-4 py-3 font-mono text-xs text-canvas outline-none focus:border-cornflower"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => simulateSuccess(`Updated eligibility root to ${newRoot.slice(0, 10)}...!`)}
                className="flex-1 py-3 rounded-xl bg-pear hover:bg-pear-hover text-obsidian-deep font-bold text-xs uppercase tracking-wider transition-all"
              >
                Set Eligibility Root
              </button>
              <button
                onClick={() => handleCopy(`// setEligibilityRoot("${newRoot}")`, 'root')}
                className="px-5 py-3 rounded-xl border border-obsidian-border hover:bg-obsidian-surface text-mist text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-cornflower" />
                <span>{copiedText === 'root' ? 'Copied!' : 'Copy Calldata'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Finalize Round */}
        {activeAction === 'finalize' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-lg font-bold text-canvas">Finalize Quadratic Scores & Allocate Pool</h3>
              <p className="text-xs text-mist/75 mt-0.5">
                <code className="text-pear">finalize()</code> executes the integer quadratic formula and pool scaling for all registered projects.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-obsidian-surface border border-obsidian-border space-y-2 text-xs">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold">
                <Clock className="w-4 h-4" />
                <span>Round Window Lock: Closes Nov 06, 2026 (timestamp 1793923200)</span>
              </div>
              <p className="text-mist/70">
                Calling <code className="text-pear">finalize()</code> before the deadline will revert with <code className="text-rose-400">RoundStillOpen()</code>. After the deadline, finalization is permissionless.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => simulateSuccess('finalize() executed! Scores and matches locked onchain.')}
                className="flex-1 py-3 rounded-xl bg-pear hover:bg-pear-hover text-obsidian-deep font-bold text-xs uppercase tracking-wider transition-all"
              >
                Execute finalize()
              </button>
              <button
                onClick={() => handleCopy(`// finalize()\n// Target: ${CONTRACT_ADDRESS}`, 'fin')}
                className="px-5 py-3 rounded-xl border border-obsidian-border hover:bg-obsidian-surface text-mist text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-cornflower" />
                <span>{copiedText === 'fin' ? 'Copied!' : 'Copy Calldata'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
