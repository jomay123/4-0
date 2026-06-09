import { useEffect, useRef, useState } from 'react';
import { DRAFT_CATEGORIES } from '../types';
import type { DraftCategory } from '../types';
import { getCategoryMeta } from '../lib/draft';

interface CategorySlotProps {
  spinning: boolean;
  result: DraftCategory | null;
  onSpinComplete?: () => void;
}

const REEL_ITEMS = [...DRAFT_CATEGORIES, ...DRAFT_CATEGORIES, ...DRAFT_CATEGORIES];
const ITEM_HEIGHT = 64;

export function CategorySlot({ spinning, result, onSpinComplete }: CategorySlotProps) {
  const [offset, setOffset] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!spinning || !result) return;
    completedRef.current = false;
    setOffset(0);

    const resultIndex = DRAFT_CATEGORIES.findIndex((c) => c.key === result);
    const landIndex = DRAFT_CATEGORIES.length + resultIndex;
    const targetOffset = landIndex * ITEM_HEIGHT;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffset(targetOffset));
    });

    const timer = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onSpinComplete?.();
      }
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [spinning, result, onSpinComplete]);

  const displayCategory = result ? getCategoryMeta(result) : null;

  return (
    <div className="slot-machine">
      <div className="slot-frame">
        <div className="slot-window">
          <div
            className={`slot-reel ${spinning ? 'spinning' : ''}`}
            style={{ transform: `translateY(-${offset}px)` }}
          >
            {REEL_ITEMS.map((cat, i) => (
              <div key={`${cat.key}-${i}`} className="slot-item">
                <span className="slot-short">{cat.short}</span>
                <span className="slot-label">{cat.label}</span>
              </div>
            ))}
          </div>
          <div className="slot-highlight" />
        </div>
      </div>

      {!spinning && displayCategory && (
        <div className="slot-result">
          <span className="slot-result-tag">Category</span>
          <strong>{displayCategory.label}</strong>
          <span className="slot-result-desc">{displayCategory.description}</span>
        </div>
      )}

      {spinning && <p className="spin-text">Pulling the lever…</p>}
    </div>
  );
}
