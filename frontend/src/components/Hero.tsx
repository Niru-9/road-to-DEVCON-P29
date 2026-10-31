import React from 'react';
import { ArrowUpRight, ShieldCheck, Flame, Cpu, Users } from 'lucide-react';
import { NavigationPage } from '../types';
import { CONTRACT_ADDRESS } from '../config/contracts';

interface HeroProps {
  onNavigate: (page: NavigationPage) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section className="relative overflow-hidden pt-10 pb-20 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-pear/10 via-cornflower/10 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Headline & Editorial Typography */}
        <div className="lg:col-span-7 z-10 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-obsidian-card border border-obsidian-border text-[11px] font-semibold text-pear tracking-wide">
            <Flame className="w-3.5 h-3.5 text-pear" />
            <span>Problem Statement 2: Two Hundred Small Backers Beat One Whale</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif tracking-tight leading-[1.06] text-canvas">
            THE QUADRATIC // <br />
            <span className="italic font-normal text-pear">CROWDFUNDING</span> <br />
            DECENTRALIZED <br />
            <span className="text-cornflower font-sans font-bold tracking-normal">COMMONS</span>
          </h1>

          <p className="text-base sm:text-lg text-mist/80 max-w-xl font-normal leading-relaxed">
            Fueling digital and public goods through democratic matching math on Sepolia.
            Empowering grassroots Indian Ethereum builders ahead of Devcon with verified Road to Devcon attendee attestations.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('rounds')}
              className="px-8 py-3.5 rounded-full bg-pear hover:bg-pear-hover text-obsidian-deep font-bold text-xs tracking-wider uppercase transition-all shadow-glow-pear active:scale-95"
            >
              Explore Active Rounds
            </button>
            <button
              onClick={() => onNavigate('results')}
              className="px-7 py-3.5 rounded-full border border-mist/20 text-canvas hover:text-pear font-semibold text-xs tracking-wider uppercase hover:border-pear/40 hover:bg-obsidian-card transition-all flex items-center space-x-2"
            >
              <span>Verify Math & Results</span>
              <ArrowUpRight className="w-4 h-4 text-mist" />
            </button>
          </div>

          {/* Quick Contract & Anti-Sybil Callout */}
          <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-mist/60 border-t border-obsidian-border/60">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sepolia: <span className="font-mono text-mist/90">{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span></span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-cornflower" />
              <span>Merkle Allowlist Active</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-pear" />
              <span>EVM Integer Math bit-for-bit</span>
            </div>
          </div>
        </div>

        {/* Right Fluid Mesh Ribbon Visual (Matching 82173.png) */}
        <div className="lg:col-span-5 relative flex justify-center items-center min-h-[440px]">
          {/* Layered Organic 3D Fluid Silk Flow Graphic */}
          <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
            
            {/* SVG Organic Flow Silk Contours */}
            <svg 
              className="absolute inset-0 w-full h-full filter drop-shadow-2xl overflow-visible pointer-events-none" 
              viewBox="0 0 500 500" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="silkFlow1" x1="15%" y1="0%" x2="90%" y2="100%">
                  <stop offset="0%" stopColor="#E1E5AC" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#C4CF95" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#6AA6DA" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#191C10" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="silkFlow2" x1="85%" y1="10%" x2="10%" y2="90%">
                  <stop offset="0%" stopColor="#6AA6DA" stopOpacity="0.9" />
                  <stop offset="45%" stopColor="#DBE3E9" stopOpacity="0.7" />
                  <stop offset="80%" stopColor="#E1E5AC" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#11130B" stopOpacity="0.95" />
                </linearGradient>

                <radialGradient id="silkGlow" cx="60%" cy="40%" r="55%">
                  <stop offset="0%" stopColor="#E1E5AC" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#6AA6DA" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#11130B" stopOpacity="0" />
                </radialGradient>

                <filter id="meshBlur" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
                  <feGaussianBlur stdDeviation="24" />
                </filter>
              </defs>

              {/* Ambient Mesh Glow Behind */}
              <circle cx="280" cy="220" r="180" fill="url(#silkGlow)" filter="url(#meshBlur)" />

              {/* Back Wave */}
              <path 
                d="M180,60 C280,20 420,80 440,210 C460,340 330,440 220,460 C110,480 40,360 80,240 C120,120 80,100 180,60 Z" 
                fill="url(#silkFlow2)" 
                opacity="0.6"
              />

              {/* Main Dramatic Organic Silk Fold (Cascading from top-right down) */}
              <path 
                d="M340,10 C460,60 490,180 430,290 C370,400 240,480 140,430 C40,380 50,260 120,170 C190,80 220,-40 340,10 Z" 
                fill="url(#silkFlow1)" 
                opacity="0.85"
              />

              {/* Highlight Contour Ribbons */}
              <path 
                d="M260,40 C340,100 380,230 320,330 C260,430 180,420 120,350 C60,280 130,210 180,150 C230,90 180,-20 260,40 Z" 
                fill="url(#silkFlow2)" 
                opacity="0.7"
              />
            </svg>

            {/* Glass Centerpiece Displaying Quadratic Formula */}
            <div className="relative z-10 w-72 sm:w-80 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-xl bg-obsidian-card/75 p-6 text-center space-y-3.5 transition-transform hover:scale-105 duration-500">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-obsidian-deep/80 border border-white/10 text-[10px] uppercase font-semibold text-mist/80 tracking-widest">
                <span>Quadratic Multiplier</span>
              </div>

              <div className="text-3xl sm:text-4xl font-serif text-canvas tracking-wider py-1">
                {"(Σ √c_i)²"}
              </div>

              <p className="text-xs text-mist/80 leading-relaxed max-w-[240px] mx-auto">
                Micro-donations trigger quadratic multiplier matching from the sponsor pool.
              </p>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-mist/70">Matching Formula</span>
                <span className="text-pear font-mono font-semibold">floor(score × pool ÷ Σ score)</span>
              </div>

              <div className="flex justify-center items-center space-x-1.5 text-[11px] text-emerald-400 font-semibold pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sepolia Round Live</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
