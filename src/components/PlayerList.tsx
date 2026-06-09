import type { DisplayMode, DraftCategory, GameMode, Golfer } from '../types';
import { countryFlag, getCategoryMeta, getSkillValue } from '../lib/draft';
import { formatStat, sgToRating, totalStatLabel, type RatingScales } from '../lib/ratings';

interface PlayerListProps {
  golfers: Golfer[];
  category: DraftCategory;
  mode: GameMode;
  displayMode: DisplayMode;
  ratingScales: RatingScales;
  onSelect: (golfer: Golfer) => void;
  onReroll?: () => void;
  rerollsLeft?: number;
  disabled?: boolean;
}

export function PlayerList({
  golfers,
  category,
  mode,
  displayMode,
  ratingScales,
  onSelect,
  onReroll,
  rerollsLeft = 0,
  disabled,
}: PlayerListProps) {
  const meta = getCategoryMeta(category);

  return (
    <div className="player-list">
      <div className="player-list-header">
        <div>
          <h3>Pick your {meta.label} specialist</h3>
          <p>{meta.description} · choose 1 of {golfers.length} random options</p>
        </div>
        {onReroll && rerollsLeft > 0 && (
          <button
            type="button"
            className="btn btn-secondary reroll-btn"
            onClick={onReroll}
            disabled={disabled}
          >
            Reroll options ({rerollsLeft} left)
          </button>
        )}
      </div>
      <div className="player-options">
        {golfers.map((golfer) => {
          const skill = getSkillValue(golfer, category);
          const categoryRange = ratingScales.byCategory[category];
          const skillDisplay =
            displayMode === 'sg' ? skill : sgToRating(skill, categoryRange);
          const isHot =
            displayMode === 'sg' ? skill >= 0.5 : skillDisplay >= 85;
          const isCold =
            displayMode === 'sg' ? skill < 0 : skillDisplay <= 58;

          return (
            <button
              key={golfer.dg_id}
              type="button"
              className="player-card"
              disabled={disabled}
              onClick={() => onSelect(golfer)}
            >
              <div className="player-card-top">
                <span className="player-rank">#{golfer.dg_rank}</span>
                <span className="player-flag">{countryFlag(golfer.country)}</span>
              </div>
              <div className="player-name">{golfer.player_name}</div>
              {mode === 'classic' && (
                <div className="player-stats">
                  <span className={`sg-highlight ${isHot ? 'hot' : isCold ? 'cold' : ''}`}>
                    {meta.short}: {formatStat(skill, displayMode, categoryRange)}
                  </span>
                  <span className="sg-total">
                    {totalStatLabel(displayMode)}:{' '}
                    {formatStat(golfer.sg_total, displayMode, ratingScales.total)}
                  </span>
                </div>
              )}
              {mode === 'expert' && (
                <div className="player-stats expert">
                  <span>???</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
