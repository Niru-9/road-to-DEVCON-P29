import React, { useState } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "What is Quadratic Funding & how does this round work?",
      answer: "Quadratic Funding (QF) is an optimal public goods allocation mechanism where matching funds are distributed based on the number of contributors rather than just the raw capital given. In this contract, each project's score is computed onchain as the square of the sum of the square roots of each contributor's total: (Σ √c_i)². When the round ends, the sponsor matching pool is scaled to all projects proportionally using floor integer division."
    },
    {
      question: "How is my impact amplified? (Two Hundred Small Backers Beat One Whale)",
      answer: "Because square roots compress large individual numbers and reward broad aggregation, many small contributions generate a vastly higher quadratic score than a single large whale check. For example: 200 people giving 0.01 ETH each (2 ETH total) score 4×10²⁰, while a whale giving 100 ETH scores only 1×10²⁰. In a 100 ETH pool, the 200 small contributors unlock 80 ETH, while the whale receives 20 ETH. Breadth wins 4:1."
    },
    {
      question: "How does on-chain Merkle eligibility prevent Sybil attacks?",
      answer: "In previous rounds, dishonest actors created dummy accounts to game the square root math. In this contract, Arjun restricts contributions to verified Road to Devcon attendees. Each contribution requires a valid Merkle proof against eligibilityRoot (0x8cb9...). Furthermore, multiple contributions from the same address are aggregated into a single contributorTotal, mathematically neutralizing transaction splitting."
    },
    {
      question: "Are contracts deployed on Ethereum Sepolia?",
      answer: "Yes. The QuadraticFundingRound contract is deployed and verified on Ethereum Sepolia testnet at 0x634740A6D3334e23c24B22F73C01e69431d8310F (Block 12024921). All scoring arithmetic uses OpenZeppelin Math.sqrt and Math.mulDiv, ensuring 512-bit intermediate precision and exact zero-loss accounting onchain."
    },
    {
      question: "How do project leads claim their funds?",
      answer: "Once the round reaches its endTime (Nov 06, 2026), anyone may permissionlessly trigger finalize(). Then, the registered payout address of each project calls withdraw(projectId) to receive their collected contributions plus their allocated matching pool share in a single non-reentrant transaction."
    }
  ];

  return (
    <section id="faq" className="py-16 px-6 sm:px-10 max-w-7xl mx-auto">
      <div className="mb-10 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold text-pear bg-obsidian-card px-3 py-1 rounded-full border border-obsidian-border mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Mechanics & Specs</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-canvas tracking-tight">FREQUENTLY ASKED QUESTIONS</h2>
        <p className="text-sm text-mist/70 mt-1">Everything you need to know about mathematical quadratic matching on Sepolia.</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-obsidian-border bg-obsidian-card/60 hover:bg-obsidian-card rounded-2xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-semibold text-canvas hover:text-pear transition-colors"
              >
                <span>{faq.question}</span>
                <span className="ml-4 p-1 rounded-full bg-obsidian-surface text-mist">
                  {isOpen ? <Minus className="w-4 h-4 text-pear" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-mist/80 leading-relaxed border-t border-obsidian-border/50">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
