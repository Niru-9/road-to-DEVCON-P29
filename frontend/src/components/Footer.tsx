import React from 'react';
import { ExternalLink, Github, Twitter, MessageSquare, ShieldCheck } from 'lucide-react';
import { NavigationPage } from '../types';
import { CONTRACT_ADDRESS } from '../config/contracts';

interface FooterProps {
  onNavigate: (page: NavigationPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-obsidian-deep border-t border-obsidian-border pt-16 pb-12 px-6 sm:px-10 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-obsidian-border/60">
        
        {/* Brand & Mission */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-7 h-7 relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-pear" />
              <div className="absolute top-0 w-1.5 h-1.5 rounded-full bg-cornflower" />
              <div className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-cornflower" />
            </div>
            <span className="text-xl font-bold font-sans tracking-tight text-canvas">CommonsFund</span>
          </div>

          <p className="text-xs text-mist/70 leading-relaxed">
            Democratic capital allocation for grassroots Indian Ethereum initiatives. Fueling public goods via verifiable quadratic math.
          </p>

          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sepolia: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
          </div>
        </div>

        {/* Column 1: Application Navigation */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-mist/80">Application</h4>
          <ul className="space-y-2 text-xs text-mist/65">
            <li>
              <button onClick={() => onNavigate('home')} className="hover:text-pear transition-colors">Overview</button>
            </li>
            <li>
              <button onClick={() => onNavigate('rounds')} className="hover:text-pear transition-colors">Explore Initiatives</button>
            </li>
            <li>
              <button onClick={() => onNavigate('results')} className="hover:text-pear transition-colors">Verifiable Results Engine</button>
            </li>
            <li>
              <button onClick={() => onNavigate('eligibility')} className="hover:text-pear transition-colors">Attendee Pass Portal</button>
            </li>
            <li>
              <button onClick={() => onNavigate('withdraw')} className="hover:text-pear transition-colors">Project Claim & Payout</button>
            </li>
          </ul>
        </div>

        {/* Column 2: Protocol & Contracts */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-mist/80">Protocol & Audit</h4>
          <ul className="space-y-2 text-xs text-mist/65">
            <li>
              <a 
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}#code`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-pear transition-colors flex items-center space-x-1"
              >
                <span>Sepolia Contract</span>
                <ExternalLink className="w-3 h-3 text-mist/40" />
              </a>
            </li>
            <li>
              <button onClick={() => onNavigate('operator')} className="hover:text-pear transition-colors">Operator Console</button>
            </li>
            <li>
              <a href="#faq" className="hover:text-pear transition-colors">QF Math Documentation</a>
            </li>
            <li>
              <span className="text-mist/40">OpenZeppelin 5.6 Verified</span>
            </li>
          </ul>
        </div>

        {/* Column 3: Social & Community */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-mist/80">Community</h4>
          <div className="flex items-center space-x-3 pt-1">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-obsidian-card border border-obsidian-border flex items-center justify-center text-mist hover:text-canvas hover:border-pear transition-all"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-obsidian-card border border-obsidian-border flex items-center justify-center text-mist hover:text-canvas hover:border-pear transition-all"
              aria-label="X / Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a 
              href="https://discord.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-obsidian-card border border-obsidian-border flex items-center justify-center text-mist hover:text-canvas hover:border-pear transition-all"
              aria-label="Discord"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
          <p className="text-[11px] text-mist/50 pt-2 leading-relaxed">
            Built for the Road to Devcon India • Devcon 8 Ecosystem Initiative.
          </p>
        </div>

      </div>

      {/* Bottom Legal / Copyright */}
      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-mist/50 gap-3">
        <span>© 2026 CommonsFund. Open source quadratic public goods protocol.</span>
        <div className="flex items-center space-x-4">
          <span>Non-custodial pull payments</span>
          <span>•</span>
          <span>Zero private keys stored</span>
        </div>
      </div>
    </footer>
  );
};
