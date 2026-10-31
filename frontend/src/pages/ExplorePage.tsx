import React, { useState } from 'react';
import { Search, Tag, ExternalLink, Sparkles } from 'lucide-react';
import { Project } from '../types';

interface ExplorePageProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ projects, onSelectProject }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'mostBackers' | 'highestRaised' | 'id'>('mostBackers');

  const categories = ['All', 'Vernacular Docs', 'Developer Education', 'Student Clubs', 'Regional Ecosystem'];

  const filtered = projects
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'mostBackers') return b.contributorCount - a.contributorCount;
      if (sortBy === 'highestRaised') return b.contributionsEth - a.contributionsEth;
      return a.id - b.id;
    });

  return (
    <div className="py-12 px-6 sm:px-10 max-w-7xl mx-auto space-y-10">
      
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-pear bg-obsidian-card px-3.5 py-1 rounded-full border border-obsidian-border">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Road to Devcon India • Grassroots Initiatives</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-serif text-canvas tracking-tight">
          EXPLORE INITIATIVES & ROUNDS
        </h1>
        <p className="text-mist/75 text-sm sm:text-base max-w-2xl leading-relaxed">
          Discover verified Indian developer communities, vernacular documentation projects, and student chapters eligible for quadratic matching. Every contribution boosts their matching pool allocation.
        </p>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="bg-obsidian-card p-4 sm:p-6 rounded-2xl border border-obsidian-border space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-mist/60 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search initiatives, languages, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-obsidian-surface border border-obsidian-border rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-canvas placeholder:text-mist/40 outline-none focus:border-cornflower transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end text-xs">
            <span className="text-mist/60">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-obsidian-surface border border-obsidian-border rounded-xl px-3 py-2 text-canvas text-xs outline-none focus:border-cornflower"
            >
              <option value="mostBackers">Most Backers (High QF Signal)</option>
              <option value="highestRaised">Highest Raised (ETH)</option>
              <option value="id">Registration Order</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-obsidian-border/50">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-pear text-obsidian-deep font-bold shadow-glow-pear'
                  : 'bg-obsidian-surface text-mist hover:text-canvas border border-obsidian-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((project) => {
          const progressPercent = Math.min(100, Math.round((project.contributionsEth / project.targetEth) * 100));

          return (
            <div
              key={project.id}
              className="group bg-obsidian-card rounded-2xl border border-obsidian-border hover:border-cornflower/40 transition-all duration-300 p-6 flex flex-col justify-between space-y-5 hover:shadow-glow-cornflower"
            >
              {/* Card Banner */}
              <div className={`w-full h-44 rounded-xl ${project.gradientClass} relative overflow-hidden flex items-end p-4 border border-white/5`}>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-obsidian-deep/80 backdrop-blur-md text-canvas border border-white/10 flex items-center space-x-1.5">
                  <Tag className="w-3 h-3 text-pear" />
                  <span>{project.category}</span>
                </span>

                <div className="absolute top-3 right-3 text-xs font-mono font-medium text-canvas bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                  Project #{project.id}
                </div>
              </div>

              {/* Title & Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold text-canvas group-hover:text-cornflower transition-colors">
                    {project.name}
                  </h3>
                  <span className="text-xs font-semibold text-pear bg-pear/10 px-2 py-0.5 rounded border border-pear/20 shrink-0">
                    {project.contributorCount} Backers
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-mist/75 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                {/* Payout & Metadata */}
                <div className="pt-2 text-[11px] font-mono text-mist/50 flex flex-wrap gap-x-4">
                  <span>Payout: {project.payout.slice(0, 8)}...{project.payout.slice(-6)}</span>
                  <span>URI: {project.metadataURI || "'' ''"}</span>
                </div>
              </div>

              {/* Progress & CTAs */}
              <div className="space-y-3 pt-3 border-t border-obsidian-border">
                <div className="flex justify-between text-xs font-medium text-mist/80">
                  <span className="text-canvas font-semibold">{project.contributionsEth} ETH raised</span>
                  <span className="text-mist/60">{project.targetEth} ETH target ({progressPercent}%)</span>
                </div>

                <div className="w-full bg-obsidian-surface h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-cornflower via-pear to-pear rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => onSelectProject(project)}
                    className="flex-1 py-3 rounded-xl bg-obsidian-surface hover:bg-cornflower hover:text-obsidian-deep border border-obsidian-border text-canvas font-bold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pear" />
                    <span>Contribute & Amplify Matching</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
