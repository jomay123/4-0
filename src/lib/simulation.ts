import { buildCompositePlayer } from './composite';
import { SIM_CONFIG } from './sim-config';
import type {
  CompositePlayer,
  DraftPick,
  Golfer,
  PlayerTournamentResult,
  SeasonResult,
  SeasonTier,
  TournamentResult,
} from '../types';
import { COMPOSITE_ID, TOTAL_MAJORS } from '../types';

const TOURNAMENTS = [
  { name: 'Sony Open', isMajor: false },
  { name: 'Farmers Insurance Open', isMajor: false },
  { name: 'WM Phoenix Open', isMajor: false },
  { name: 'Genesis Invitational', isMajor: false },
  { name: 'Arnold Palmer Invitational', isMajor: false },
  { name: 'THE PLAYERS Championship', isMajor: false },
  { name: 'Valspar Championship', isMajor: false },
  { name: 'Masters Tournament', isMajor: true },
  { name: 'RBC Heritage', isMajor: false },
  { name: 'PGA Championship', isMajor: true },
  { name: 'Memorial Tournament', isMajor: false },
  { name: 'U.S. Open', isMajor: true },
  { name: 'Travelers Championship', isMajor: false },
  { name: 'The Open Championship', isMajor: true },
  { name: 'FedEx St. Jude Championship', isMajor: false },
  { name: 'Tour Championship', isMajor: false },
] as const;

interface SimGolfer {
  id: number;
  name: string;
  sg_total: number;
  isComposite: boolean;
}

function randomNormal(mean = 0, stdDev = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function toSimGolfer(golfer: Golfer): SimGolfer {
  return {
    id: golfer.dg_id,
    name: golfer.player_name,
    sg_total: golfer.sg_total,
    isComposite: false,
  };
}

function compositeToSimGolfer(composite: CompositePlayer): SimGolfer {
  return {
    id: COMPOSITE_ID,
    name: composite.player_name,
    sg_total: composite.sg_total,
    isComposite: true,
  };
}

function roundScore(player: SimGolfer, courseDifficulty: number): number {
  const noiseStd = player.isComposite
    ? SIM_CONFIG.compositeNoiseStd
    : SIM_CONFIG.fieldNoiseStd;
  const expected = 72 - player.sg_total + courseDifficulty;
  const noise = randomNormal(0, noiseStd);
  return Math.round((expected + noise) * 10) / 10;
}

function buildField(pool: SimGolfer[], composite: SimGolfer): SimGolfer[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const fieldSize = Math.min(SIM_CONFIG.fieldSize, shuffled.length);
  return [composite, ...shuffled.slice(0, fieldSize)];
}

interface RoundStanding {
  player: SimGolfer;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  total36: number;
  total72: number;
  madeCut: boolean;
}

function simulateTournament(
  name: string,
  isMajor: boolean,
  pool: SimGolfer[],
  composite: SimGolfer,
): TournamentResult {
  const courseDifficulty =
    randomNormal(0, SIM_CONFIG.courseDiffStd) + (isMajor ? SIM_CONFIG.majorDiffBonus : 0);
  const field = buildField(pool, composite);

  const standings: RoundStanding[] = field.map((player) => {
    const r1 = roundScore(player, courseDifficulty);
    const r2 = roundScore(player, courseDifficulty);
    return {
      player,
      r1,
      r2,
      r3: 0,
      r4: 0,
      total36: r1 + r2,
      total72: 0,
      madeCut: false,
    };
  });

  const sorted36 = [...standings].sort((a, b) => a.total36 - b.total36);
  const cutCount = Math.max(12, Math.floor(sorted36.length * SIM_CONFIG.cutPct));
  const cutLine = sorted36[Math.min(cutCount - 1, sorted36.length - 1)].total36;

  for (const entry of standings) {
    entry.madeCut = entry.total36 <= cutLine;
    if (entry.madeCut) {
      entry.r3 = roundScore(entry.player, courseDifficulty);
      entry.r4 = roundScore(entry.player, courseDifficulty);
      entry.total72 = entry.total36 + entry.r3 + entry.r4;
    } else {
      entry.total72 = entry.total36;
    }
  }

  const finishers = standings
    .filter((p) => p.madeCut)
    .sort((a, b) => a.total72 - b.total72);

  const winner = finishers[0];
  const compositeStanding = standings.find((s) => s.player.isComposite)!;

  let position: number | 'MC';
  let score: number;

  if (!compositeStanding.madeCut) {
    position = 'MC';
    score = Math.round(compositeStanding.total36);
  } else {
    position = finishers.findIndex((f) => f.player.isComposite) + 1;
    score = Math.round(compositeStanding.total72);
  }

  const finish: PlayerTournamentResult = {
    position,
    score,
    madeCut: compositeStanding.madeCut,
    won: position === 1,
  };

  return {
    name,
    isMajor,
    fieldSize: field.length,
    finish,
    winnerName: winner?.player.name ?? '—',
    winnerScore: winner ? Math.round(winner.total72) : 0,
  };
}

function getTier(majorWins: number, regularWins: number): SeasonTier {
  if (majorWins >= TOTAL_MAJORS) return 'grand-slam';
  if (majorWins === 3) return 'triple-major';
  if (majorWins === 2) return 'dual-major';
  if (majorWins === 1) return 'major-winner';
  if (regularWins >= 1) return 'tour-card';
  return 'winless';
}

export function simulateSeason(picks: DraftPick[], fullPool: Golfer[]): SeasonResult {
  const composite = buildCompositePlayer(picks);
  const compositeSim = compositeToSimGolfer(composite);
  const pool = fullPool.map(toSimGolfer);
  const tournaments: TournamentResult[] = [];

  for (const event of TOURNAMENTS) {
    tournaments.push(simulateTournament(event.name, event.isMajor, pool, compositeSim));
  }

  const wins = tournaments.filter((t) => t.finish.won).length;
  const numericFinishes = tournaments
    .filter((t): t is TournamentResult & { finish: { position: number } } =>
      typeof t.finish.position === 'number',
    )
    .map((t) => t.finish.position);

  const top5s = numericFinishes.filter((p) => p <= 5).length;
  const top10s = numericFinishes.filter((p) => p <= 10).length;
  const cutsMade = tournaments.filter((t) => t.finish.madeCut).length;
  const majorWins = tournaments.filter((t) => t.isMajor && t.finish.won).length;
  const regularWins = tournaments.filter((t) => !t.isMajor && t.finish.won).length;

  const bestFinish = numericFinishes.length > 0 ? Math.min(...numericFinishes) : null;
  const worstFinish = tournaments.reduce<number | 'MC' | 'WD' | null>((worst, t) => {
    const pos = t.finish.position;
    if (pos === 'MC' || pos === 'WD') return worst === null ? pos : worst;
    if (worst === 'MC' || worst === 'WD') return worst;
    if (worst === null || pos > worst) return pos;
    return worst;
  }, null);

  const avgFinish =
    numericFinishes.length > 0
      ? Math.round((numericFinishes.reduce((a, b) => a + b, 0) / numericFinishes.length) * 10) / 10
      : null;

  return {
    composite,
    tournaments,
    totalEvents: tournaments.length,
    totalMajors: TOTAL_MAJORS,
    wins,
    losses: tournaments.length - wins,
    top5s,
    top10s,
    cutsMade,
    cutsPossible: tournaments.length,
    tier: getTier(majorWins, regularWins),
    bestFinish,
    worstFinish,
    majorWins,
    avgFinish,
  };
}

export const TIER_LABELS: Record<SeasonTier, { title: string; subtitle: string }> = {
  'grand-slam': {
    title: 'Career Grand Slam',
    subtitle: 'Masters, PGA, U.S. Open, and The Open — your composite won them all.',
  },
  'triple-major': {
    title: 'Triple Major Season',
    subtitle: 'One major shy of immortality. So close to the slam.',
  },
  'dual-major': {
    title: 'Dual Major Champion',
    subtitle: 'Two majors in one season — elite, but not the full sweep.',
  },
  'major-winner': {
    title: 'Major Champion',
    subtitle: 'You captured a major. The other three slipped away.',
  },
  'tour-card': {
    title: 'Tour Winner',
    subtitle: 'Regular season success, but no major glory this year.',
  },
  winless: {
    title: 'Winless Season',
    subtitle: 'No majors, no wins. Back to the drawing board.',
  },
};
