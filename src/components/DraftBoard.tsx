import type { DisplayMode, DraftPick, GameMode } from '../types';
import { DRAFT_CATEGORIES } from '../types';
import { formatStat, totalStatLabel, type RatingScales } from '../lib/ratings';

interface DraftBoardProps {
  picks: DraftPick[];
  mode: GameMode;
  displayMode: DisplayMode;
  ratingScales: RatingScales;
}

export function DraftBoard({ picks, mode, displayMode, ratingScales }: DraftBoardProps) {
  const picksByCategory = Object.fromEntries(picks.map((p) => [p.category, p]));

  return (
    <div className="draft-board">
      <h4>Building Composite</h4>
      <div className="roster-slots">
        {DRAFT_CATEGORIES.map((cat) => {
          const pick = picksByCategory[cat.key];
          return (
            <div key={cat.key} className={`roster-slot ${pick ? 'filled' : ''}`}>
              <span className="slot-cat">{cat.short}</span>
              {pick ? (
                <span className="slot-name">{pick.golfer.player_name}</span>
              ) : (
                <span className="slot-empty">—</span>
              )}
            </div>
          );
        })}
      </div>
      {picks.length > 0 && mode === 'classic' && (
        <p className="draft-board-note">
          {totalStatLabel(displayMode)} = sum of all four skills
          {picks.length === DRAFT_CATEGORIES.length && (
            <>
              {' '}
              →{' '}
              <strong>
                {formatStat(
                  picks.reduce((sum, p) => sum + p.golfer[p.category], 0),
                  displayMode,
                  ratingScales.compositeTotal,
                )}
              </strong>
            </>
          )}
        </p>
      )}
    </div>
  );
}
