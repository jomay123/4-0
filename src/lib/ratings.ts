import type { DisplayMode, DraftCategory, Golfer } from '../types';
import { formatSg } from './draft';

export interface StatRange {
  min: number;
  max: number;
}

export interface RatingScales {
  byCategory: Record<DraftCategory, StatRange>;
  total: StatRange;
  /** Sum of per-category mins/maxes — range for a composite's total. */
  compositeTotal: StatRange;
}

const CATEGORIES: DraftCategory[] = ['sg_ott', 'sg_app', 'sg_arg', 'sg_putt'];
const RATING_MIN = 50;
const RATING_MAX = 99;

function statRange(values: number[]): StatRange {
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function buildRatingScales(golfers: Golfer[]): RatingScales {
  const byCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, statRange(golfers.map((g) => g[cat]))]),
  ) as Record<DraftCategory, StatRange>;

  return {
    byCategory,
    total: statRange(golfers.map((g) => g.sg_total)),
    compositeTotal: {
      min: CATEGORIES.reduce((sum, cat) => sum + byCategory[cat].min, 0),
      max: CATEGORIES.reduce((sum, cat) => sum + byCategory[cat].max, 0),
    },
  };
}

/** Map SG into a 50–99 rating; pool min → 50, pool max → 99. */
export function sgToRating(sg: number, range: StatRange): number {
  const { min, max } = range;
  if (max <= min) return RATING_MAX;
  const t = (sg - min) / (max - min);
  return Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(RATING_MIN + t * (RATING_MAX - RATING_MIN))));
}

export function formatStat(value: number, displayMode: DisplayMode, range: StatRange): string {
  if (displayMode === 'sg') return formatSg(value);
  return String(sgToRating(value, range));
}

export function totalStatLabel(displayMode: DisplayMode): string {
  return displayMode === 'sg' ? 'Total SG' : 'Overall';
}
