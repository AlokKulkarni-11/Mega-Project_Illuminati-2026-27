import React, { useState, useRef, useEffect } from 'react';
import { GLOSSARY_TERMS } from '../features/glossary/glossaryData';

interface GlossaryTermProps {
  termKey: string;
  children?: React.ReactNode;
}

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ termKey, children }) => {
  const [pinned, setPinned] = useState(false);
  const [hot, setHot] = useState(false);
  const isOpen = pinned || hot;
  const setIsOpen = (v: boolean) => { setPinned(v); if (!v) setHot(false); };
  const containerRef = useRef<HTMLSpanElement>(null);

  const definition = GLOSSARY_TERMS[termKey] || {
    term: termKey,
    definition: 'Term defined in financial research ledger.',
    category: 'statistics',
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <span ref={containerRef} className="relative inline-block" onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
      <button
        type="button"
        onClick={() => setPinned(!pinned)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        className="cursor-help border-b border-dashed border-ink-soft hover:text-brass text-inherit font-inherit inline text-left bg-transparent p-0 m-0"
                aria-expanded={isOpen}
      >
        {children || definition.term}
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-40 bottom-full left-0 mb-2 w-72 p-3 bg-paper-inset border border-rule shadow-sm text-xs text-ink rounded-none"
        >
          <div className="font-serif font-semibold text-sm mb-1 text-ink">{definition.term}</div>
          <p className="text-ink-soft leading-relaxed">{definition.definition}</p>
          <div className="mt-2 text-[10px] text-brass uppercase tracking-wider font-mono">
            {definition.category}
          </div>
        </div>
      )}
    </span>
  );
};
