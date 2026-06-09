import fallbackPlayers from '../data/fallback-players.json';
import type { Golfer } from '../types';

interface DGRankingRow {
  dg_id: number;
  player_name: string;
  country?: string;
  country_code?: string;
  dg_rank?: number;
  rank?: number;
  sg_total?: number;
  sg_ott?: number;
  sg_app?: number;
  sg_arg?: number;
  sg_putt?: number;
  total?: number;
  ott?: number;
  app?: number;
  arg?: number;
  putt?: number;
}

interface DGRankingsResponse {
  rankings?: DGRankingRow[];
  data?: DGRankingRow[];
}

interface DGSkillRow {
  dg_id: number;
  player_name: string;
  sg_total?: number;
  sg_ott?: number;
  sg_app?: number;
  sg_arg?: number;
  sg_putt?: number;
  total?: number;
  ott?: number;
  app?: number;
  arg?: number;
  putt?: number;
}

interface DGSkillResponse {
  players?: DGSkillRow[];
  data?: DGSkillRow[];
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeGolfer(row: DGRankingRow, skills?: DGSkillRow): Golfer {
  const skill = skills ?? row;
  return {
    dg_id: row.dg_id,
    player_name: row.player_name,
    country: row.country ?? row.country_code ?? '—',
    dg_rank: row.dg_rank ?? row.rank ?? 999,
    sg_total: num(skill.sg_total ?? skill.total, num(row.sg_total, 0)),
    sg_ott: num(skill.sg_ott ?? skill.ott, num(row.sg_ott, 0)),
    sg_app: num(skill.sg_app ?? skill.app, num(row.sg_app, 0)),
    sg_arg: num(skill.sg_arg ?? skill.arg, num(row.sg_arg, 0)),
    sg_putt: num(skill.sg_putt ?? skill.putt, num(row.sg_putt, 0)),
  };
}

async function fetchJson<T>(path: string, apiKey?: string): Promise<T | null> {
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
  const url = `/api/datagolf${path}${path.includes('?') ? '&' : '?'}file_format=json${keyParam}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadTopGolfers(limit = 50, apiKey?: string): Promise<{
  golfers: Golfer[];
  source: 'datagolf' | 'fallback';
}> {
  if (!apiKey) {
    return {
      golfers: (fallbackPlayers as Golfer[]).slice(0, limit),
      source: 'fallback',
    };
  }

  const [rankingsData, skillsData] = await Promise.all([
    fetchJson<DGRankingsResponse>('/preds/get-dg-rankings', apiKey),
    fetchJson<DGSkillResponse>('/preds/skill-ratings?display=value', apiKey),
  ]);

  const rankingRows = rankingsData?.rankings ?? rankingsData?.data;
  if (!rankingRows?.length) {
    return {
      golfers: (fallbackPlayers as Golfer[]).slice(0, limit),
      source: 'fallback',
    };
  }

  const skillRows = skillsData?.players ?? skillsData?.data ?? [];
  const skillMap = new Map(skillRows.map((row) => [row.dg_id, row]));

  const golfers = rankingRows
    .slice(0, limit)
    .map((row) => normalizeGolfer(row, skillMap.get(row.dg_id)))
    .sort((a, b) => a.dg_rank - b.dg_rank);

  return { golfers, source: 'datagolf' };
}

export function getFallbackGolfers(limit = 50): Golfer[] {
  return (fallbackPlayers as Golfer[]).slice(0, limit);
}
