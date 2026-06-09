#!/usr/bin/env node
/**
 * Fetches top 50 golfers + skill ratings from DataGolf and writes fallback-players.json.
 * Usage: DATAGOLF_API_KEY=your_key node scripts/fetch-players.mjs
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.DATAGOLF_API_KEY;

if (!API_KEY) {
  console.error('Set DATAGOLF_API_KEY environment variable');
  process.exit(1);
}

async function fetchJson(path) {
  const url = `https://feeds.datagolf.com${path}${path.includes('?') ? '&' : '?'}file_format=json&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${path}: ${res.status}`);
  return res.json();
}

const rankings = await fetchJson('/preds/get-dg-rankings');
const skills = await fetchJson('/preds/skill-ratings?display=value');

const rankingRows = rankings.rankings ?? rankings.data ?? [];
const skillRows = skills.players ?? skills.data ?? [];
const skillMap = new Map(skillRows.map((r) => [r.dg_id, r]));

const golfers = rankingRows.slice(0, 50).map((row) => {
  const s = skillMap.get(row.dg_id) ?? row;
  return {
    dg_id: row.dg_id,
    player_name: row.player_name,
    country: row.country ?? row.country_code ?? '—',
    dg_rank: row.dg_rank ?? row.rank,
    sg_total: s.sg_total ?? s.total ?? row.sg_total ?? 0,
    sg_ott: s.sg_ott ?? s.ott ?? 0,
    sg_app: s.sg_app ?? s.app ?? 0,
    sg_arg: s.sg_arg ?? s.arg ?? 0,
    sg_putt: s.sg_putt ?? s.putt ?? 0,
  };
});

const outPath = join(__dirname, '../src/data/fallback-players.json');
writeFileSync(outPath, JSON.stringify(golfers, null, 2) + '\n');
console.log(`Wrote ${golfers.length} players to ${outPath}`);
