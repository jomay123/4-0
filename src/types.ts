export type DraftCategory = 'sg_ott' | 'sg_app' | 'sg_arg' | 'sg_putt';

export interface Golfer {
  dg_id: number;
  player_name: string;
  country: string;
  dg_rank: number;
  sg_total: number;
  sg_ott: number;
  sg_app: number;
  sg_arg: number;
  sg_putt: number;
}

export type GameMode = 'classic' | 'expert';

/** How skill values are shown in the UI — simulation always uses raw SG. */
export type DisplayMode = 'sg' | 'rating';

export interface DraftPick {
  round: number;
  category: DraftCategory;
  golfer: Golfer;
}

export interface CompositePart {
  category: DraftCategory;
  golferName: string;
  value: number;
}

export interface CompositePlayer {
  player_name: string;
  sg_ott: number;
  sg_app: number;
  sg_arg: number;
  sg_putt: number;
  sg_total: number;
  parts: CompositePart[];
}

export interface PlayerTournamentResult {
  position: number | 'MC' | 'WD';
  score: number;
  madeCut: boolean;
  won: boolean;
}

export interface TournamentResult {
  name: string;
  isMajor: boolean;
  fieldSize: number;
  finish: PlayerTournamentResult;
  winnerName: string;
  winnerScore: number;
}

export interface SeasonResult {
  composite: CompositePlayer;
  tournaments: TournamentResult[];
  totalEvents: number;
  totalMajors: number;
  wins: number;
  losses: number;
  top5s: number;
  top10s: number;
  cutsMade: number;
  cutsPossible: number;
  tier: SeasonTier;
  bestFinish: number | null;
  worstFinish: number | 'MC' | 'WD' | null;
  majorWins: number;
  avgFinish: number | null;
}

export type SeasonTier =
  | 'winless'
  | 'tour-card'
  | 'major-winner'
  | 'dual-major'
  | 'triple-major'
  | 'grand-slam';

export const TOTAL_MAJORS = 4;

export type GamePhase = 'welcome' | 'draft' | 'simulating' | 'results';

export const DRAFT_CATEGORIES: {
  key: DraftCategory;
  label: string;
  short: string;
  description: string;
}[] = [
  { key: 'sg_ott', label: 'Off the Tee', short: 'OTT', description: 'Driving distance & accuracy' },
  { key: 'sg_app', label: 'Approach', short: 'APP', description: 'Iron play into greens' },
  { key: 'sg_arg', label: 'Around Green', short: 'ARG', description: 'Short game & scrambling' },
  { key: 'sg_putt', label: 'Putting', short: 'PUTT', description: 'Greenside putting' },
];

export const DRAFT_ROUNDS = 4;
export const DRAFT_OPTIONS = 5;
export const MAX_REROLLS = 1;

export const COMPOSITE_ID = 0;
