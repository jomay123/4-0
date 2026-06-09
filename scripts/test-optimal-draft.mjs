#!/usr/bin/env node
/**
 * Monte Carlo test: optimal category picks → composite golfer → season sims.
 * Run: node scripts/test-optimal-draft.mjs [numSeasons]
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const players = JSON.parse(
  readFileSync(join(__dirname, '../src/data/fallback-players.json'), 'utf8'),
);

const CATEGORIES = ['sg_ott', 'sg_app', 'sg_arg', 'sg_putt'];
const NUM_EVENTS = 16;
const COMPOSITE_ID = 0;

// Mirror src/lib/sim-config.ts
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

function getSkill(golfer, category) {
  return golfer[category];
}

function bestForCategory(pool, category) {
  return [...pool].sort((a, b) => getSkill(b, category) - getSkill(a, category))[0];
}

/** Best per category, same golfer allowed multiple times (theoretical max). */
function buildUnrestrictedOptimal() {
  const picks = {};
  for (const cat of CATEGORIES) {
    const g = bestForCategory(players, cat);
    picks[cat] = { golfer: g, value: getSkill(g, cat) };
  }
  return buildComposite(picks, 'Best per skill (max composite)');
}

/** Best per category, each golfer used at most once (realistic optimal draft). */
function buildUniqueOptimal() {
  const used = new Set();
  const picks = {};

  for (const cat of CATEGORIES) {
    const available = players.filter((g) => !used.has(g.dg_id));
    const g = bestForCategory(available, cat);
    used.add(g.dg_id);
    picks[cat] = { golfer: g, value: getSkill(g, cat) };
  }
  return buildComposite(picks, 'Unique golfers (realistic optimal)');
}

function buildComposite(picks, label) {
  const sg_ott = picks.sg_ott.value;
  const sg_app = picks.sg_app.value;
  const sg_arg = picks.sg_arg.value;
  const sg_putt = picks.sg_putt.value;
  const sg_total = sg_ott + sg_app + sg_arg + sg_putt;

  return {
    label,
    sg_ott,
    sg_app,
    sg_arg,
    sg_putt,
    sg_total,
    parts: CATEGORIES.map((cat) => ({
      category: cat,
      golfer: picks[cat].golfer.player_name,
      value: picks[cat].value,
    })),
  };
}

function roundScore(player, courseDifficulty) {
  const noiseStd = player.isComposite ? SIM_CONFIG.compositeNoiseStd : SIM_CONFIG.fieldNoiseStd;
  const expected = 72 - player.sg_total + courseDifficulty;
  const noise = randomNormal(0, noiseStd);
  return Math.round((expected + noise) * 10) / 10;
}

function simulateTournament(isMajor, composite, pool) {
  const courseDifficulty =
    randomNormal(0, SIM_CONFIG.courseDiffStd) + (isMajor ? SIM_CONFIG.majorDiffBonus : 0);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const fieldSize = Math.min(SIM_CONFIG.fieldSize, shuffled.length);
  const simPlayers = [
    { id: COMPOSITE_ID, sg_total: composite.sg_total, isComposite: true },
    ...shuffled.slice(0, fieldSize).map((g) => ({
      id: g.dg_id,
      sg_total: g.sg_total,
      isComposite: false,
    })),
  ];

  const standings = simPlayers.map((player) => {
    const r1 = roundScore(player, courseDifficulty);
    const r2 = roundScore(player, courseDifficulty);
    return { player, r1, r2, r3: 0, r4: 0, total36: r1 + r2, total72: 0, madeCut: false };
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

  const finishers = standings.filter((p) => p.madeCut).sort((a, b) => a.total72 - b.total72);
  const compositeStanding = standings.find((s) => s.player.isComposite);

  if (!compositeStanding.madeCut) {
    return { won: false, position: 'MC', madeCut: false };
  }

  const position = finishers.findIndex((f) => f.player.isComposite) + 1;
  return { won: position === 1, position, madeCut: true };
}

function simulateSeason(composite) {
  let wins = 0;
  const results = [];

  for (const event of TOURNAMENTS) {
    const finish = simulateTournament(event.isMajor, composite, players);
    if (finish.won) wins++;
    results.push({ ...event, ...finish });
  }

  return { wins, results, perfect: wins === NUM_EVENTS };
}

function runMonteCarlo(composite, seasons) {
  const winCounts = {};
  let perfectSeasons = 0;
  let totalWins = 0;
  let totalCuts = 0;
  const samplePerfect = null;

  for (let i = 0; i < seasons; i++) {
    const season = simulateSeason(composite);
    totalWins += season.wins;
    winCounts[season.wins] = (winCounts[season.wins] || 0) + 1;
    if (season.perfect) perfectSeasons++;
    for (const r of season.results) {
      if (r.madeCut) totalCuts++;
    }
  }

  return {
    seasons,
    perfectSeasons,
    perfectPct: ((perfectSeasons / seasons) * 100).toFixed(3),
    avgWins: (totalWins / seasons).toFixed(2),
    avgCuts: ((totalCuts / (seasons * NUM_EVENTS)) * 100).toFixed(1),
    winDistribution: winCounts,
  };
}

function printComposite(composite) {
  console.log(`\n=== ${composite.label} ===`);
  console.log(`Composite SG: total=${composite.sg_total.toFixed(2)} (sum of skills=${(composite.sg_ott + composite.sg_app + composite.sg_arg + composite.sg_putt).toFixed(2)})`);
  console.log(`  OTT ${composite.sg_ott.toFixed(2)} | APP ${composite.sg_app.toFixed(2)} | ARG ${composite.sg_arg.toFixed(2)} | PUTT ${composite.sg_putt.toFixed(2)}`);
  for (const p of composite.parts) {
    console.log(`  ${p.category.replace('sg_', '').toUpperCase().padEnd(5)} ← ${p.golfer} (${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)})`);
  }
}

function printResults(stats) {
  console.log(`\nRan ${stats.seasons.toLocaleString()} simulated seasons:`);
  console.log(`  16-0 perfect seasons: ${stats.perfectSeasons} (${stats.perfectPct}%)`);
  console.log(`  Avg wins per season:   ${stats.avgWins} / ${NUM_EVENTS}`);
  console.log(`  Avg cut rate:          ${stats.avgCuts}%`);
  console.log(`  Win distribution:`);
  const sorted = Object.keys(stats.winDistribution).map(Number).sort((a, b) => a - b);
  for (const w of sorted) {
    const pct = ((stats.winDistribution[w] / stats.seasons) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`    ${String(w).padStart(2)} wins: ${String(stats.winDistribution[w]).padStart(5)} (${pct.padStart(5)}%) ${bar}`);
  }
}

// Single deterministic-ish run for eyeballing one season
function printSingleSeason(composite) {
  const season = simulateSeason(composite);
  console.log(`\n--- Sample season (${season.wins}-${NUM_EVENTS - season.wins}) ---`);
  for (const r of season.results) {
    const tag = r.won ? '🏆 WIN' : r.position === 'MC' ? 'MC' : `T${r.position}`;
    console.log(`  ${r.isMajor ? '★' : ' '} ${r.name.padEnd(32)} ${tag}`);
  }
}

const seasons = Number(process.argv[2]) || 5000;

console.log('Optimal Draft Monte Carlo Test');
console.log(`Players: ${players.length} | Events: ${NUM_EVENTS} | Simulations: ${seasons}`);

const unrestricted = buildUnrestrictedOptimal();
const unique = buildUniqueOptimal();

printComposite(unrestricted);
printSingleSeason(unrestricted);
printResults(runMonteCarlo(unrestricted, seasons));

printComposite(unique);
printSingleSeason(unique);
printResults(runMonteCarlo(unique, seasons));

// Brute-force check: run extra sims hunting for any 16-0 if rate is low
if (seasons <= 10000) {
  console.log('\n--- Hunting for 16-0 (up to 50,000 extra attempts, unrestricted) ---');
  let found = 0;
  let attempts = 0;
  const maxAttempts = 50000;
  while (found < 3 && attempts < maxAttempts) {
    attempts++;
    const s = simulateSeason(unrestricted);
    if (s.perfect) {
      found++;
      console.log(`\nFound 16-0 #${found} on attempt ${attempts}:`);
      for (const r of s.results) {
        console.log(`  ${r.isMajor ? '★' : ' '} ${r.name.padEnd(32)} ${r.won ? '🏆 WIN' : `T${r.position}`}`);
      }
    }
  }
  if (found === 0) {
    console.log(`No 16-0 found in ${maxAttempts.toLocaleString()} attempts.`);
  }
}
