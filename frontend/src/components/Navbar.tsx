import React, { useState } from 'react';
import { Wallet, Copy, LogOut, ChevronDown, Radio } from 'lucide-react';
import { NavigationPage } from '../types';

interface NavbarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  walletConnected: boolean;
  walletAddress: string;
  isSimulated: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onSelectSimulatedWallet?: (address: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  walletConnected,
  walletAddress,
  isSimulated,
  onConnectWallet,
  onDisconnectWallet,
  onSelectSimulatedWallet
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navItems: { id: NavigationPage; label: string }[] = [
    { id: 'home', label: 'Overview' },
    { id: 'rounds', label: 'Explore & Donate' },
    { id: 'results', label: 'Verify Math & Results' },
    { id: 'eligibility', label: 'Attendee Pass' },
    { id: 'withdraw', label: 'Project Withdraw' },
    { id: 'operator', label: 'Operator' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-obsidian-deep/90 border-b border-obsidian-border px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          {/* Custom 6-dot cluster / daisy icon from reference design */}
          <div className="w-8 h-8 relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-pear group-hover:scale-110 transition-transform shadow-glow-pear" />
            <div className="absolute top-0 w-2 h-2 rounded-full bg-cornflower" />
            <div className="absolute bottom-0 w-2 h-2 rounded-full bg-cornflower" />
            <div className="absolute left-0 w-2 h-2 rounded-full bg-canvas/80" />
            <div className="absolute right-0 w-2 h-2 rounded-full bg-canvas/80" />
          </div>

          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-canvas font-sans flex items-center gap-1.5">
              CommonsFund
            </span>
            <span className="text-[10px] tracking-wider uppercase text-mist/60 font-semibold -mt-1">
              Devcon India • Quadratic Commons
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-6 text-xs sm:text-sm font-medium">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`transition-colors duration-200 py-1.5 px-3 rounded-full ${
                  isActive
                    ? 'text-canvas bg-obsidian-card border border-mist/15 font-semibold text-pear'
                    : 'text-mist/75 hover:text-canvas'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Network Badge and Wallet Trigger */}
        <div className="flex items-center space-x-3">
          {/* Sepolia Network Badge */}
          <div className="hidden sm:flex items-center space-x-2 text-xs bg-obsidian-card px-3.5 py-1.5 rounded-full border border-obsidian-border text-mist">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="font-medium tracking-wide">Sepolia</span>
            <span className="text-[10px] text-mist/50">11155111</span>
          </div>

          {/* Connect Wallet / Account Pill */}
          <div className="relative">
            {walletConnected ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 bg-obsidian-card hover:bg-obsidian-surface border border-cornflower/40 text-canvas px-4 py-2 rounded-full font-semibold text-xs tracking-wide transition-all duration-200 shadow-md shadow-cornflower/10"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  {isSimulated && (
                    <span className="text-[10px] bg-pear/20 text-pear px-1.5 py-0.5 rounded uppercase">Demo</span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-mist/70" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-obsidian-card border border-obsidian-border rounded-2xl p-3 shadow-2xl z-50 space-y-2 backdrop-blur-xl">
                    <div className="px-2 py-1.5 border-b border-obsidian-border/50">
                      <div className="text-[10px] text-mist/60 uppercase tracking-wider font-semibold">Connected Wallet</div>
                      <div className="text-xs font-mono text-canvas truncate mt-0.5">{walletAddress}</div>
                    </div>

                    <button
                      onClick={copyAddress}
                      className="w-full flex items-center justify-between text-xs text-mist hover:text-canvas px-2 py-1.5 rounded-lg hover:bg-obsidian-surface transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Copy className="w-3.5 h-3.5 text-pear" />
                        <span>Copy Address</span>
                      </span>
                      {copied && <span className="text-[10px] text-emerald-400">Copied!</span>}
                    </button>

                    <a
                      href={`https://sepolia.etherscan.io/address/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-2 text-xs text-mist hover:text-canvas px-2 py-1.5 rounded-lg hover:bg-obsidian-surface transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 text-cornflower" />
                      <span>View on Etherscan</span>
                    </a>

                    {onSelectSimulatedWallet && (
                      <div className="pt-1.5 border-t border-obsidian-border/50">
                        <div className="text-[10px] text-mist/60 px-2 pb-1 uppercase font-semibold">Switch Test Wallet</div>
                        <button
                          onClick={() => {
                            onSelectSimulatedWallet('0x0d3477209913afFAF06CDe63Dd0F13f4C5728135');
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left text-xs text-mist hover:text-pear px-2 py-1 rounded hover:bg-obsidian-surface truncate"
                        >
                          Arjun (Operator 0x0d34...)
                        </button>
                        <button
                          onClick={() => {
                            onSelectSimulatedWallet('0xF859C8B7462a9e30Ee4ec627ca2cAab1b1a04DF7');
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left text-xs text-mist hover:text-pear px-2 py-1 rounded hover:bg-obsidian-surface truncate"
                        >
                          Project 0 Lead (0xF859...)
                        </button>
                        <button
                          onClick={() => {
                            onSelectSimulatedWallet('0x4cd9F186FB3ed767fAf9aB125a2171fEeC2F15A8');
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left text-xs text-mist hover:text-pear px-2 py-1 rounded hover:bg-obsidian-surface truncate"
                        >
                          Asha (Pune Attendee 0x4cd9...)
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        onDisconnectWallet();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors pt-2 border-t border-obsidian-border/50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onConnectWallet}
                className="flex items-center space-x-2 bg-cornflower hover:bg-cornflower-hover text-obsidian-deep px-5 py-2.5 rounded-full font-bold text-xs tracking-wide transition-all duration-200 active:scale-95 shadow-md shadow-cornflower/20"
              >
                <Wallet className="w-4 h-4 text-obsidian-deep" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Nav strip */}
      <div className="flex lg:hidden overflow-x-auto space-x-2 pt-2.5 pb-1 custom-scrollbar text-xs">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-xs transition-colors ${
              currentPage === item.id
                ? 'bg-obsidian-card text-pear border border-mist/20 font-semibold'
                : 'text-mist/70'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
