import React, { useState } from 'react';
import { GLOSSARY_TERMS, TermDefinition } from '../features/glossary/glossaryData';

export const GlossaryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const termsList: TermDefinition[] = Object.values(GLOSSARY_TERMS);

  const filteredTerms = termsList.filter((item) => {
    const matchesQuery =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="glossary-page pt-6 max-w-desk mx-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-rule pb-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-ink">Financial & Statistical Glossary</h1>
          <p className="text-xs text-ink-soft mt-1">Definitive terminology of price regimes, causal models, and portfolio statistics</p>
        </div>
        <span className="text-xs font-mono text-ink-soft uppercase">— 20 Terms Reference</span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-baseline mb-6">
        <div className="flex-1 border-b-2 border-ink pb-1 max-w-md w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search term or concept…"
            className="w-full bg-transparent border-none outline-none font-serif text-base text-ink placeholder:italic placeholder:text-ink-soft"
          />
        </div>

        <div className="flex gap-2 flex-wrap text-xs">
          {['all', 'statistics', 'regime', 'engine', 'investing'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 border transition-colors capitalize ${
                selectedCategory === cat
                  ? 'border-ink bg-brass-soft text-ink font-semibold'
                  : 'border-rule bg-paper-inset text-ink-soft hover:border-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms Dictionary List */}
      <div className="space-y-4 my-8">
        {filteredTerms.map((item) => (
          <div
            key={item.term}
            className="p-4 bg-paper-inset border border-rule hover:border-ink transition-colors"
          >
            <div className="flex items-baseline justify-between mb-1.5">
              <h2 className="font-serif text-lg font-medium text-ink">{item.term}</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-brass">
                [{item.category}]
              </span>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {item.definition}
            </p>
          </div>
        ))}

        {filteredTerms.length === 0 && (
          <div className="py-12 border border-rule bg-paper-inset text-center text-xs text-ink-soft italic">
            No glossary entries match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};
