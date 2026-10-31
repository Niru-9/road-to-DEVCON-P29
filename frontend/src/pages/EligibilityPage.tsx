import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Copy, Search, UserCheck } from 'lucide-react';
import { getMerkleProofForAddress, EXTENDED_ATTENDEES } from '../utils/merkle';
import { ROUND_CONFIG } from '../config/contracts';

interface EligibilityPageProps {
  currentAddress: string;
  onSelectAddress: (address: string) => void;
}

export const EligibilityPage: React.FC<EligibilityPageProps> = ({
  currentAddress,
  onSelectAddress
}) => {
  const [inputAddress, setInputAddress] = useState<string>(currentAddress || '0x0d3477209913afFAF06CDe63Dd0F13f4C5728135');
  const [proofCopied, setProofCopied] = useState(false);

  const proofResult = getMerkleProofForAddress(inputAddress, true);

  const copyProof = () => {
    navigator.clipboard.writeText(JSON.stringify(proofResult.proof, null, 2));
    setProofCopied(true);
    setTimeout(() => setProofCopied(false), 2000);
  };

  return (
    <div className="py-12 px-6 sm:px-10 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-pear bg-obsidian-card px-3.5 py-1 rounded-full border border-obsidian-border">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Road to Devcon Attendee Allowlist</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif text-canvas tracking-tight">
          ATTENDEE PASS & MERKLE PROOF
        </h1>
        <p className="text-mist/75 text-sm sm:text-base max-w-2xl leading-relaxed">
          Verify whether an Ethereum address holds a valid Road to Devcon attendee credential. The onchain contract checks your Merkle proof against the active root before accepting quadratic matching contributions.
        </p>
      </div>

      {/* Address Checker Form */}
      <div className="bg-obsidian-card p-6 sm:p-8 rounded-3xl border border-obsidian-border space-y-6">
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-mist uppercase tracking-wider">
            Check Address Eligibility
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-mist/60 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="0x..."
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value.trim())}
                className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono text-canvas outline-none focus:border-cornflower transition-colors"
              />
            </div>
            {currentAddress && currentAddress.toLowerCase() !== inputAddress.toLowerCase() && (
              <button
                onClick={() => setInputAddress(currentAddress)}
                className="px-4 py-3 rounded-xl bg-obsidian-surface border border-obsidian-border text-xs text-mist hover:text-canvas transition-colors"
              >
                Use Connected Wallet
              </button>
            )}
          </div>
        </div>

        {/* Eligibility Result Banner */}
        {proofResult.isEligible ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Address is Verified & Eligible for Quadratic Matching</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-mist/60">Credential Label</span>
                <div className="text-canvas font-semibold">{proofResult.label}</div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-mist/60">Verification Source</span>
                <div className="text-canvas font-semibold font-mono">{proofResult.source || 'attendee-allowlist'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>Address Not Found in Current Attendee Root</span>
            </div>
            <p className="text-xs text-mist/80">
              Only verified Road to Devcon attendees can contribute to prevent sybil gaming. Select one of the pre-verified test addresses below to simulate contributions.
            </p>
          </div>
        )}

        {/* Cryptographic Proof Details */}
        <div className="space-y-4 pt-2 border-t border-obsidian-border/60">
          <div className="text-xs font-semibold text-mist uppercase tracking-wider flex items-center justify-between">
            <span>Cryptographic Proof Data</span>
            {proofResult.isEligible && (
              <button
                onClick={copyProof}
                className="text-pear hover:underline flex items-center gap-1.5 text-xs font-mono lowercase"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{proofCopied ? 'copied!' : 'copy proof json'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-obsidian-surface border border-obsidian-border space-y-1">
              <div className="text-mist/60 text-[11px]">Computed Leaf: keccak256(abi.encode(addr))</div>
              <div className="text-canvas truncate">{proofResult.leaf || '0x'}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-obsidian-surface border border-obsidian-border space-y-1">
              <div className="text-mist/60 text-[11px]">Active Contract Merkle Root</div>
              <div className="text-pear truncate">{ROUND_CONFIG.initialEligibilityRoot}</div>
            </div>
          </div>

          {proofResult.isEligible && (
            <div className="space-y-2">
              <div className="text-[11px] text-mist/60 font-mono">Proof Hashes (bytes32[]):</div>
              <div className="p-3.5 rounded-xl bg-obsidian-surface border border-obsidian-border max-h-36 overflow-y-auto custom-scrollbar font-mono text-[11px] text-canvas space-y-1">
                {proofResult.proof.map((hash, i) => (
                  <div key={i} className="truncate">[{i}] {hash}</div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Pre-Verified Test Attendees Picker */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-canvas">Verified Test Attendees</h3>
          <p className="text-xs text-mist/70">
            Click any verified wallet below to immediately inspect its proof and test quadratic contributions:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXTENDED_ATTENDEES.slice(0, 6).map((att) => (
            <button
              key={att.address}
              onClick={() => {
                setInputAddress(att.address);
                onSelectAddress(att.address);
              }}
              className="text-left p-4 rounded-xl bg-obsidian-card hover:bg-obsidian-surface border border-obsidian-border hover:border-pear/40 transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-canvas group-hover:text-pear transition-colors">{att.label}</span>
                <span className="text-[10px] text-mist/50">{att.source}</span>
              </div>
              <div className="font-mono text-[11px] text-mist/70 truncate">{att.address}</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
