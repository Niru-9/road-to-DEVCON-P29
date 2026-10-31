import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TelemetryBar } from './components/TelemetryBar';
import { ActiveRounds } from './components/ActiveRounds';
import { MultiplierBanner } from './components/MultiplierBanner';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { QuadraticDrawer } from './components/QuadraticDrawer';

import { ExplorePage } from './pages/ExplorePage';
import { ResultsPage } from './pages/ResultsPage';
import { EligibilityPage } from './pages/EligibilityPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { OperatorPage } from './pages/OperatorPage';

import { useWeb3Round } from './hooks/useWeb3Round';
import { NavigationPage, Project } from './types';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('home');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const {
    walletConnected,
    walletAddress,
    isSimulated,
    projects,
    roundSummary,
    connectWallet,
    disconnectWallet,
    toggleSimulatedWallet,
    contributeToProject
  } = useWeb3Round();

  // Sync navigation with window URL hash for bookmarking & browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavigationPage;
      if (['home', 'rounds', 'results', 'eligibility', 'withdraw', 'operator'].includes(hash)) {
        setCurrentPage(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: NavigationPage) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmContribution = async (projectId: number, amountEth: number) => {
    return await contributeToProject(projectId, amountEth);
  };

  return (
    <div className="min-h-screen flex flex-col bg-obsidian-deep text-canvas font-sans selection:bg-cornflower selection:text-obsidian-deep">
      
      {/* Navbar with Page Switcher and Sepolia Network Badge */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        isSimulated={isSimulated}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onSelectSimulatedWallet={(addr) => toggleSimulatedWallet(addr)}
      />

      {/* Main Dynamic View Area */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            <Hero onNavigate={navigateTo} />
            <TelemetryBar summary={roundSummary} />
            <ActiveRounds
              projects={projects}
              onSelectProject={(p) => setSelectedProject(p)}
              onNavigate={navigateTo}
            />
            <MultiplierBanner 
              onNavigate={navigateTo}
              onOpenQuickDonate={() => setSelectedProject(projects[0])}
            />
            <FAQ />
          </>
        )}

        {currentPage === 'rounds' && (
          <ExplorePage
            projects={projects}
            onSelectProject={(p) => setSelectedProject(p)}
          />
        )}

        {currentPage === 'results' && (
          <ResultsPage
            projects={projects}
            summary={roundSummary}
          />
        )}

        {currentPage === 'eligibility' && (
          <EligibilityPage
            currentAddress={walletAddress}
            onSelectAddress={(addr) => toggleSimulatedWallet(addr)}
          />
        )}

        {currentPage === 'withdraw' && (
          <WithdrawPage
            projects={projects}
            summary={roundSummary}
            walletAddress={walletAddress}
            onSelectTestWallet={(addr) => toggleSimulatedWallet(addr)}
          />
        )}

        {currentPage === 'operator' && (
          <OperatorPage
            summary={roundSummary}
            projects={projects}
            walletAddress={walletAddress}
            onSelectTestWallet={(addr) => toggleSimulatedWallet(addr)}
          />
        )}
      </main>

      {/* Persistent Obsidian Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Progressive Disclosure Slide-out Quadratic Drawer */}
      <QuadraticDrawer
        project={selectedProject}
        walletAddress={walletAddress}
        matchingPoolEth={roundSummary.matchingPoolEth}
        onClose={() => setSelectedProject(null)}
        onConfirmContribution={handleConfirmContribution}
        onSelectTestWallet={(addr) => toggleSimulatedWallet(addr)}
      />

    </div>
  );
};
export default App;
