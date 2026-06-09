# 4/4 Majors

A browser-based golf draft game inspired by [82-0](https://www.82-0.com) and [38-0](https://38-0-0.com).

Build a composite golfer from four skill specialists, then simulate a full PGA season. The goal is to win all four majors — the Masters, PGA Championship, U.S. Open, and The Open.

## What this is

You draft golfers from the world's top 50 (using DataGolf-style strokes-gained ratings). Each pick contributes one skill to your composite player:

- **OTT** — Off the Tee
- **APP** — Approach
- **ARG** — Around the Green
- **PUTT** — Putting

Your composite's total skill rating is the sum of all four. That single merged player then competes across a 16-event season. Regular tour wins matter, but **major wins decide your tier** — from winless up to a Career Grand Slam (4/4).

## How to play

1. Pick **Classic** (stats shown) or **Expert** (stats hidden).
2. Pull the slot machine to land on a skill category.
3. Choose one of five random golfers for that skill.
4. Repeat for four rounds. You get one reroll per game to redraw your options.
5. Watch your composite play out the season and see if you captured the Grand Slam.

## Player data

The app includes bundled ratings for the top 50 golfers, so it works out of the box with no setup. Player data is modeled on [DataGolf](https://datagolf.com) strokes-gained rankings.

## Tech stack

- React + TypeScript
- Vite
- No backend — runs entirely in the browser

## Project structure

```
src/
  components/     UI (draft, slot machine, results)
  data/           Top 50 golfer ratings (JSON)
  lib/            Draft logic, composite builder, simulation
```

## Run locally

```bash
npm install
npm run build   # production build
npm run dev     # development server at http://localhost:5173
```
