import React, { useState, useEffect } from 'react';
import { Layers, Timer, Users, CircleDot } from 'lucide-react';
import { RoundSummary } from '../types';

interface TelemetryBarProps {
  summary: RoundSummary;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({ summary }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number }>({
    days: 5,
    hours: 14,
    minutes: 32
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // endTime = 1793923200 (Nov 06, 2026)
      const target = summary.endTime ? summary.endTime * 1000 : Date.now() + 5 * 24 * 3600 * 1000;
      const difference = target - Date.now();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        setTimeLeft({ days, hours, minutes });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [summary.endTime]);

  return (
    <div className="w-full bg-obsidian-surface/90 border-y border-obsidian-border py-4 px-6 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-4 gap-x-8 text-xs sm:text-sm font-medium text-mist/80">
        
        {/* Metric 1: Matching Pool */}
        <div className="flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-cornflower shrink-0" />
          <span>
            MATCHING POOL: <strong className="text-canvas font-bold ml-1">{summary.matchingPoolEth.toFixed(1)} ETH</strong>
          </span>
        </div>

        <div className="hidden lg:block text-mist/20">|</div>

        {/* Metric 2: Round Countdown */}
        <div className="flex items-center space-x-2.5">
          <Timer className="w-4 h-4 text-pear shrink-0" />
          <span>
            ROUND ACTIVE: <strong className="text-pear font-bold ml-1">
              {timeLeft.days > 0 ? `${timeLeft.days} DAYS LEFT` : `${timeLeft.hours}H ${timeLeft.minutes}M LEFT`}
            </strong>
          </span>
        </div>

        <div className="hidden lg:block text-mist/20">|</div>

        {/* Metric 3: Total Voters */}
        <div className="flex items-center space-x-2.5">
          <Users className="w-4 h-4 text-cornflower shrink-0" />
          <span>
            VERIFIED BACKERS: <strong className="text-canvas font-bold ml-1">{summary.totalVoters}+</strong>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>

        <div className="hidden lg:block text-mist/20">|</div>

        {/* Metric 4: Contributions */}
        <div className="flex items-center space-x-2.5">
          <CircleDot className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            TOTAL INFLOW: <strong className="text-canvas font-bold ml-1">{summary.totalContributionsEth.toFixed(2)} ETH</strong>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cornflower" />
        </div>

      </div>
    </div>
  );
};
