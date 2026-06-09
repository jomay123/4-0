import type { DisplayMode, DraftCategory, GameMode, SeasonResult } from '../types';
import { TIER_LABELS } from '../lib/simulation';
import { getCategoryMeta } from '../lib/draft';
import { formatStat, totalStatLabel, type RatingScales } from '../lib/ratings';

interface ResultsProps {
  season: SeasonResult;
  mode: GameMode;
  displayMode: DisplayMode;
  ratingScales: RatingScales;
  onPlayAgain: () => void;
}

function formatFinish(pos: number | 'MC' | 'WD' | null): string {
  if (pos === null) return '—';
  if (pos === 'MC') return 'MC';
  if (pos === 'WD') return 'WD';
  if (pos === 1) return '1st';
  return `T${pos}`;
}

const COMPOSITE_STATS: { key: DraftCategory | 'sg_total'; label: string }[] = [
  { key: 'sg_total', label: 'total' },
  { key: 'sg_ott', label: 'OTT' },
  { key: 'sg_app', label: 'APP' },
  { key: 'sg_arg', label: 'ARG' },
  { key: 'sg_putt', label: 'PUTT' },
];

export function Results({ season, mode, displayMode, ratingScales, onPlayAgain }: ResultsProps) {
  const tierMeta = TIER_LABELS[season.tier];
  const tierTitle =
    season.tier === 'grand-slam'
      ? '4/4 · Career Grand Slam'
      : tierMeta.title;
  const cutPct = season.cutsPossible
    ? Math.round((season.cutsMade / season.cutsPossible) * 100)
    : 0;
  const { composite } = season;
  const isGrandSlam = season.majorWins === season.totalMajors;
  const majors = season.tournaments.filter((t) => t.isMajor);
  const regularEvents = season.tournaments.filter((t) => !t.isMajor);
  const regularWins = regularEvents.filter((t) => t.finish.won).length;

  return (
    <div className="results">
      <div className="results-hero">
        <p className="results-label">Season Complete</p>
        <h2 className={`tier-title tier-${season.tier}`}>{tierTitle}</h2>
        <p className="tier-subtitle">{tierMeta.subtitle}</p>
        <div className="hero-record">
          <span className={`hero-record-value ${isGrandSlam ? 'perfect' : ''}`}>
            {season.majorWins}/{season.totalMajors}
          </span>
          <span className="hero-record-label">major championships won</span>
        </div>
      </div>

      <div className="majors-card">
        <h3>The Majors</h3>
        <p className="majors-desc">The goal: win all four. Regular season results count, but majors define your tier.</p>
        <div className="majors-grid">
          {majors.map((t) => (
            <div
              key={t.name}
              className={`major-result ${t.finish.won ? 'won' : ''}`}
            >
              <span className="major-name">{t.name.replace(' Tournament', '').replace(' Championship', '')}</span>
              <span className={`major-finish ${t.finish.won ? 'win' : ''}`}>
                {t.finish.won ? '🏆 Won' : formatFinish(t.finish.position)}
              </span>
              <span className="major-score">({t.finish.score})</span>
              {!t.finish.won && (
                <span className="major-winner">Won by {t.winnerName}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="composite-card">
        <h3>Your Composite Golfer</h3>
        <p className="composite-desc">
          Four specialists merged into one player. {totalStatLabel(displayMode)} is the sum of OTT,
          APP, ARG, and PUTT.
        </p>
        {mode === 'classic' && (
          <div className="composite-stats">
            {COMPOSITE_STATS.map(({ key, label }) => {
              const value = composite[key];
              const range =
                key === 'sg_total'
                  ? ratingScales.compositeTotal
                  : ratingScales.byCategory[key];
              return (
                <div key={key} className={`composite-stat ${key === 'sg_total' ? 'main' : ''}`}>
                  <span className="composite-stat-label">
                    {key === 'sg_total' ? totalStatLabel(displayMode) : label}
                  </span>
                  <span className="composite-stat-value">
                    {formatStat(value, displayMode, range)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="composite-parts">
          {composite.parts.map((part) => (
            <div key={part.category} className="composite-part">
              <span className="part-cat">{getCategoryMeta(part.category).short}</span>
              <span className="part-name">{part.golferName}</span>
              {mode === 'classic' && (
                <span className="part-val">
                  {formatStat(part.value, displayMode, ratingScales.byCategory[part.category])}
                </span>
              )}
              {mode === 'expert' && <span className="part-val">???</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="results-highlights">
        <div className="highlight-card">
          <span className="highlight-label">Regular Season</span>
          <span className="highlight-value">
            {regularWins} win{regularWins !== 1 ? 's' : ''}
            <small>of {regularEvents.length} events</small>
          </span>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Total Wins</span>
          <span className="highlight-value">
            {season.wins}
            <small>of {season.totalEvents} events</small>
          </span>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Best Finish</span>
          <span className="highlight-value">{formatFinish(season.bestFinish)}</span>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Cut Rate</span>
          <span className="highlight-value">{cutPct}%</span>
        </div>
      </div>

      <div className="results-stats">
        <div className="stat-card">
          <span className="stat-value">{season.majorWins}</span>
          <span className="stat-label">Major Wins</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{season.wins}</span>
          <span className="stat-label">Total Wins</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{season.top5s}</span>
          <span className="stat-label">Top 5s</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{season.avgFinish ? `T${season.avgFinish}` : '—'}</span>
          <span className="stat-label">Avg Finish</span>
        </div>
      </div>

      <div className="season-chart">
        <h3>Full Season</h3>
        <div className="chart-bars">
          {season.tournaments.map((t) => {
            const won = t.finish.won;
            const height = won
              ? 100
              : t.finish.position === 'MC'
                ? 8
                : Math.max(12, 100 - (t.finish.position as number) * 4);
            return (
              <div
                key={t.name}
                className={`chart-bar-col ${t.isMajor ? 'is-major-col' : ''}`}
                title={`${t.name}: ${won ? 'WIN' : formatFinish(t.finish.position)}`}
              >
                <div
                  className={`chart-bar ${won ? 'win' : ''} ${t.isMajor ? 'major' : ''}`}
                  style={{ height: `${height}%` }}
                />
                <span className={`chart-label ${won ? 'win-label' : ''}`}>
                  {won ? 'W' : t.isMajor ? '★' : '·'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          <span>← season start</span>
          <span>★ = major · W = win</span>
          <span>season end →</span>
        </div>
      </div>

      <div className="tournament-log">
        <h3>Regular Season Log</h3>
        {regularEvents.map((t) => (
          <div
            key={t.name}
            className={`tournament-row-flat ${t.finish.won ? 'won' : ''}`}
          >
            <span className="event-name">{t.name}</span>
            <span className={`event-finish ${t.finish.won ? 'win' : ''}`}>
              {t.finish.won ? '🏆 WIN' : formatFinish(t.finish.position)}
              {' '}({t.finish.score})
            </span>
            {!t.finish.won && (
              <span className="event-winner">
                Won by {t.winnerName} ({t.winnerScore})
              </span>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-large" onClick={onPlayAgain}>
        Draft Again
      </button>
    </div>
  );
}
