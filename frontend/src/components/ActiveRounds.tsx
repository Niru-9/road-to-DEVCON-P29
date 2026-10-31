import React, { useState } from 'react';
import { ExternalLink, Tag, Sparkles, ArrowRight } from 'lucide-react';
import { Project, NavigationPage } from '../types';

interface ActiveRoundsProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNavigate: (page: NavigationPage) => void;
}

export const ActiveRounds: React.FC<ActiveRoundsProps> = ({
  projects,
  onSelectProject,
  onNavigate
}) => {
  const [filter, setFilter] = useState<'primary' | 'all'>('primary');

  const displayedProjects = filter === 'primary' ? projects.slice(0, 4) : projects;

  return (
    <section id="rounds" className="py-20 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-3xl sm:text-4xl font-serif text-canvas tracking-tight">ACTIVE ROUNDS</h2>
            <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-0.5 rounded-full font-semibold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </span>
          </div>
          <p className="text-sm text-mist/70 mt-1 max-w-xl">
            Review verified Indian grassroots initiatives eligible for quadratic matching allocation on Sepolia.
          </p>
        </div>

        {/* Filter buttons matching design */}
        <div className="flex items-center space-x-1.5 bg-obsidian-card border border-obsidian-border p-1 rounded-full text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilter('primary')}
            className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
              filter === 'primary' 
                ? 'bg-canvas text-obsidian-deep font-bold shadow-sm' 
                : 'text-mist/80 hover:text-canvas'
            }`}
          >
            Primary Projects
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
              filter === 'all' 
                ? 'bg-canvas text-obsidian-deep font-bold shadow-sm' 
                : 'text-mist/80 hover:text-canvas'
            }`}
          >
            All Rounds
          </button>
        </div>
      </div>

      {/* Grid of 4 Cards (Exact 2x2 grid from 82173.png) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedProjects.map((project) => {
          const progressPercent = Math.min(100, Math.round((project.contributionsEth / project.targetEth) * 100));

          return (
            <div
              key={project.id}
              className="group bg-obsidian-card rounded-2xl border border-obsidian-border hover:border-cornflower/40 transition-all duration-300 p-6 flex flex-col justify-between space-y-5 hover:shadow-glow-cornflower"
            >
              {/* Generative Gradient Mesh Banner */}
              <div className={`w-full h-40 rounded-xl ${project.gradientClass} relative overflow-hidden flex items-end p-4 border border-white/5`}>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-obsidian-deep/80 backdrop-blur-md text-canvas border border-white/10 flex items-center space-x-1.5">
                  <Tag className="w-3 h-3 text-pear" />
                  <span>{project.tag}</span>
                </span>

                <div className="absolute top-3 right-3 text-[11px] font-mono font-medium text-canvas/80 bg-black/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/5">
                  ID #{project.id}
                </div>
              </div>

              {/* Information Body */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold text-canvas group-hover:text-cornflower transition-colors duration-200">
                    {project.name}
                  </h3>
                  <span className="text-[11px] font-medium text-pear shrink-0 bg-pear/10 px-2 py-0.5 rounded border border-pear/20">
                    {project.contributorCount} backers
                  </span>
                </div>
                <p className="text-sm text-mist/75 line-clamp-2 font-normal leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Progress & Trigger */}
              <div className="space-y-3 pt-3 border-t border-obsidian-border">
                <div className="flex justify-between text-xs font-medium text-mist/80">
                  <span className="text-canvas font-semibold">{project.contributionsEth} ETH raised</span>
                  <span className="text-mist/60">{project.targetEth} ETH target</span>
                </div>

                <div className="w-full bg-obsidian-surface h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cornflower via-pear to-pear rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onSelectProject(project)}
                    className="w-full py-3 rounded-xl bg-obsidian-surface hover:bg-cornflower hover:text-obsidian-deep border border-obsidian-border text-canvas font-bold text-xs tracking-wide transition-all duration-200 active:scale-98 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pear group-hover:text-obsidian-deep" />
                    <span>Contribute & Amplify Matching</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA to View Full Explorer */}
      <div className="mt-12 text-center">
        <button
          onClick={() => onNavigate('rounds')}
          className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-mist hover:text-pear border border-mist/20 hover:border-pear/40 px-6 py-3 rounded-full transition-all"
        >
          <span>Explore All Registered Grassroots Initiatives</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
