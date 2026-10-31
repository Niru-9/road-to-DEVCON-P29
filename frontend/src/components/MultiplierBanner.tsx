import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { NavigationPage } from '../types';

interface MultiplierBannerProps {
  onNavigate: (page: NavigationPage) => void;
  onOpenQuickDonate?: () => void;
}

export const MultiplierBanner: React.FC<MultiplierBannerProps> = ({ onNavigate, onOpenQuickDonate }) => {
  return (
    <section className="py-8 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden border border-white/10 p-8 sm:p-14 text-center bg-gradient-to-r from-[#191c10] via-[#262b1a] to-[#11130b] shadow-2xl">
        {/* Background fluid mesh flow simulation */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_50%,rgba(106,166,218,0.35)_0%,transparent_60%),radial-gradient(circle_at_70%_50%,rgba(225,229,172,0.3)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-semibold text-pear tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-pear" />
            <span>Community Quadratic Signal Amplified</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-serif text-canvas tracking-tight leading-tight uppercase">
            QUADRATIC MATCHING <br />
            MULTIPLIER ACTIVE NOW
          </h2>

          <p className="text-sm sm:text-base text-mist/80 max-w-xl mx-auto leading-relaxed">
            Every 0.01 ETH contributed by a verified Road to Devcon attendee unlocks disproportionate matching yield from Arjun&apos;s sponsor pool. Breadth is mathematically rewarded over whale capital.
          </p>

          <div className="pt-2 flex flex-wrap justify-center items-center gap-4">
            <button
              onClick={() => {
                if (onOpenQuickDonate) {
                  onOpenQuickDonate();
                } else {
                  onNavigate('rounds');
                }
              }}
              className="px-8 py-3.5 rounded-full bg-pear hover:bg-pear-hover text-obsidian-deep font-bold text-xs tracking-wider uppercase transition-all shadow-glow-pear active:scale-95"
            >
              Participate Now
            </button>

            <button
              onClick={() => onNavigate('results')}
              className="px-7 py-3.5 rounded-full border border-mist/20 text-canvas hover:text-pear font-semibold text-xs tracking-wider uppercase hover:border-pear/40 hover:bg-obsidian-card transition-all flex items-center space-x-2"
            >
              <span>See Proof Engine</span>
              <ArrowRight className="w-4 h-4 text-mist" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
