#!/usr/bin/env node
/**
 * Monte Carlo: how often does each strategy win all 4 majors?
 * Run: node scripts/sim-grand-slam.mjs [numSeasons]
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const players = JSON.parse(
  readFileSync(join(__dirname, '../src/data/fallback-players.json'), 'utf8'),
);

const CATEGORIES = ['sg_ott', 'sg_app', 'sg_arg', 'sg_putt'];
const MAJOR_INDICES = [7, 9, 11, 13];
const DRAFT_OPTIONS = 5;
const DRAFT_ROUNDS = 4;

const SIM_CONFIG = {
  fieldNoiseStd: 1.15,
  compositeNoiseStd: 0.78,
  courseDiffStd: 0.32,
  majorDiffBonus: 0.35,
  fieldSize: 32,
  cutPct: 0.65,
};

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
];

function randomNormal(mean = 0, stdDev = 1) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function getSkill(g, cat) {
  return g[cat];
}

function bestForCategory(pool, category) {
  return [...pool].sort((a, b) => getSkill(b, category) - getSkill(a, category))[0];
}

function buildOptimalComposite() {
  const picks = {};
  for (const cat of CATEGORIES) {
    const g = bestForCategory(players, cat);
    picks[cat] = getSkill(g, cat);
  }
  return picks.sg_ott + picks.sg_app + picks.sg_arg + picks.sg_putt;
}

function buildUniqueOptimalComposite() {
  const used = new Set();
  let total = 0;
  for (const cat of CATEGORIES) {
    const available = players.filter((g) => !used.has(g.dg_id));
    const g = bestForCategory(available, cat);
    used.add(g.dg_id);
    total += getSkill(g, cat);
  }
  return total;
}

/** Simulate a realistic random draft (5 options per round, no reroll). */
function buildRandomDraftComposite() {
  const used = new Set();
  const usedCats = [];
  let total = 0;

  for (let round = 0; round < DRAFT_ROUNDS; round++) {
    const available = players.filter((g) => !used.has(g.dg_id));
    const availableCats = CATEGORIES.filter((c) => !usedCats.includes(c));
    const category = availableCats[Math.floor(Math.random() * availableCats.length)];
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, Math.min(DRAFT_OPTIONS, shuffled.length));
    const pick = options[Math.floor(Math.random() * options.length)];
    used.add(pick.dg_id);
    usedCats.push(category);
    total += getSkill(pick, category);
  }
  return total;
}

function roundScore(player, courseDifficulty) {
  const noiseStd = player.isComposite ? SIM_CONFIG.compositeNoiseStd : SIM_CONFIG.fieldNoiseStd;
  const expected = 72 - player.sg_total + courseDifficulty;
  return Math.round((expected + randomNormal(0, noiseStd)) * 10) / 10;
}

function simulateTournament(isMajor, hero, pool) {
  const courseDifficulty =
    randomNormal(0, SIM_CONFIG.courseDiffStd) + (isMajor ? SIM_CONFIG.majorDiffBonus : 0);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const fieldSize = Math.min(SIM_CONFIG.fieldSize, shuffled.length);
  const simPlayers = [
    { sg_total: hero.sg, isComposite: hero.isComposite, name: hero.name },
    ...shuffled.slice(0, fieldSize).map((g) => ({
      sg_total: g.sg_total,
      isComposite: false,
      name: g.player_name,
    })),
  ];

  const standings = simPlayers.map((player) => {
    const r1 = roundScore(player, courseDifficulty);
    const r2 = roundScore(player, courseDifficulty);
    return { player, r1, r2, total36: r1 + r2, total72: 0, madeCut: false };
  });

  const sorted36 = [...standings].sort((a, b) => a.total36 - b.total36);
  const cutCount = Math.max(12, Math.floor(sorted36.length * SIM_CONFIG.cutPct));
  const cutLine = sorted36[Math.min(cutCount - 1, sorted36.length - 1)].total36;

  for (const entry of standings) {
    entry.madeCut = entry.total36 <= cutLine;
    if (entry.madeCut) {
      const r3 = roundScore(entry.player, courseDifficulty);
      const r4 = roundScore(entry.player, courseDifficulty);
      entry.total72 = entry.total36 + r3 + r4;
    } else {
      entry.total72 = entry.total36;
    }
  }

  const finishers = standings.filter((p) => p.madeCut).sort((a, b) => a.total72 - b.total72);
  const heroStanding = standings.find((s) => s.player.isComposite === hero.isComposite && s.player.name === hero.name);
  if (!heroStanding?.madeCut) return { won: false, position: 'MC' };
  const position = finishers.findIndex((f) => f.player.name === hero.name && f.player.isComposite === hero.isComposite) + 1;
  return { won: position === 1, position };
}

function simulateSeason(hero) {
  let majorWins = 0;
  let totalWins = 0;
  const majorResults = [];

  for (let i = 0; i < TOURNAMENTS.length; i++) {
    const event = TOURNAMENTS[i];
    const result = simulateTournament(event.isMajor, hero, players);
    if (result.won) {
      totalWins++;
      if (event.isMajor) majorWins++;
    }
    if (event.isMajor) majorResults.push(result);
  }

  return { majorWins, totalWins, grandSlam: majorWins === 4, majorResults };
}

function runSims(label, heroFactory, seasons) {
  let grandSlams = 0;
  let majorWinCounts = [0, 0, 0, 0];
  let totalMajorWins = 0;
  let totalWins = 0;
  const majorDist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

  for (let i = 0; i < seasons; i++) {
    const hero = heroFactory();
    const season = simulateSeason(hero);
    totalMajorWins += season.majorWins;
    totalWins += season.totalWins;
    majorDist[season.majorWins]++;
    if (season.grandSlam) grandSlams++;

    season.majorResults.forEach((r, idx) => {
      if (r.won) majorWinCounts[idx]++;
    });
  }

  const sg = typeof heroFactory() === 'object' ? heroFactory().sg : heroFactory();

  console.log(`\n=== ${label} ===`);
  if (typeof sg === 'number') console.log(`  SG total: ${sg.toFixed(2)}`);
  console.log(`  Grand Slam (4/4): ${grandSlams}/${seasons} (${((grandSlams / seasons) * 100).toFixed(2)}%)`);
  console.log(`  Avg major wins:   ${(totalMajorWins / seasons).toFixed(2)} / 4`);
  console.log(`  Avg total wins:   ${(totalWins / seasons).toFixed(2)} / 16`);
  console.log(`  Major win distribution:`);
  for (const m of [0, 1, 2, 3, 4]) {
    const pct = ((majorDist[m] / seasons) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 3));
    console.log(`    ${m} majors: ${String(majorDist[m]).padStart(5)} (${pct.padStart(5)}%) ${bar}`);
  }
  if (majorWinCounts.length === 4) {
    console.log(`  Per-major win rate (Masters / PGA / US Open / The Open):`);
    console.log(`    ${majorWinCounts.map((c) => `${((c / seasons) * 100).toFixed(1)}%`).join(' · ')}`);
  }

  return { grandSlams, seasons, grandSlamPct: grandSlams / seasons };
}

const seasons = Number(process.argv[2]) || 20000;

console.log('Grand Slam Monte Carlo Simulation');
console.log(`Seasons per scenario: ${seasons.toLocaleString()}`);
console.log(`Sim config: field noise ${SIM_CONFIG.fieldNoiseStd}, composite noise ${SIM_CONFIG.compositeNoiseStd}`);

// 1. Optimal composite (best specialist per skill)
runSims('Optimal composite (best per skill)', () => ({
  sg: buildOptimalComposite(),
  isComposite: true,
  name: 'Composite',
}), seasons);

// 2. Realistic optimal (unique golfers)
runSims('Optimal composite (unique golfers)', () => ({
  sg: buildUniqueOptimalComposite(),
  isComposite: true,
  name: 'Composite',
}), seasons);

// 3. Average random draft (simulates typical gameplay)
const randomSgSamples = [];
for (let i = 0; i < 1000; i++) randomSgSamples.push(buildRandomDraftComposite());
const avgRandomSg = randomSgSamples.reduce((a, b) => a + b, 0) / randomSgSamples.length;
runSims(`Random draft (avg SG ~${avgRandomSg.toFixed(2)})`, () => ({
  sg: buildRandomDraftComposite(),
  isComposite: true,
  name: 'Composite',
}), seasons);

// 4. Top 4 individual golfers — do THEY sweep majors when in the field?
console.log('\n--- Top 4 individual golfers (not composite) ---');
console.log('How often does each real player win all 4 majors in a season?');
for (const g of players.slice(0, 4)) {
  runSims(`#${g.dg_rank} ${g.player_name} (sg ${g.sg_total.toFixed(2)})`, () => ({
    sg: g.sg_total,
    isComposite: false,
    name: g.player_name,
  }), seasons);
}

// 5. Who wins each major when composite isn't god-tier? Field-only baseline
console.log('\n--- Major winners (field baseline, no hero) ---');
console.log('Checking if top players dominate individual majors...');
const majorWinnerCounts = [{}, {}, {}, {}];
for (let i = 0; i < 5000; i++) {
  for (const majorIdx of MAJOR_INDICES) {
    const courseDifficulty =
      randomNormal(0, SIM_CONFIG.courseDiffStd) + SIM_CONFIG.majorDiffBonus;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const fieldSize = Math.min(SIM_CONFIG.fieldSize, shuffled.length);
    const simPlayers = shuffled.slice(0, fieldSize).map((g) => ({
      sg_total: g.sg_total,
      isComposite: false,
      name: g.player_name,
    }));

    const standings = simPlayers.map((player) => {
      const r1 = roundScore(player, courseDifficulty);
      const r2 = roundScore(player, courseDifficulty);
      return { player, r1, r2, total36: r1 + r2, total72: 0, madeCut: false };
    });
    const sorted36 = [...standings].sort((a, b) => a.total36 - b.total36);
    const cutCount = Math.max(12, Math.floor(sorted36.length * SIM_CONFIG.cutPct));
    const cutLine = sorted36[Math.min(cutCount - 1, sorted36.length - 1)].total36;
    for (const entry of standings) {
      entry.madeCut = entry.total36 <= cutLine;
      if (entry.madeCut) {
        entry.total72 = entry.total36 + roundScore(entry.player, courseDifficulty) + roundScore(entry.player, courseDifficulty);
      } else entry.total72 = entry.total36;
    }
    const winner = standings.filter((p) => p.madeCut).sort((a, b) => a.total72 - b.total72)[0];
    if (winner) {
      const counts = majorWinnerCounts[MAJOR_INDICES.indexOf(majorIdx)];
      counts[winner.player.name] = (counts[winner.player.name] || 0) + 1;
    }
  }
}
const majorNames = ['Masters', 'PGA Championship', 'U.S. Open', 'The Open'];
majorWinnerCounts.forEach((counts, i) => {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`\n  ${majorNames[i]} — top 5 winners (5000 sims):`);
  sorted.forEach(([name, count]) => {
    console.log(`    ${name}: ${((count / 5000) * 100).toFixed(1)}%`);
  });
});
