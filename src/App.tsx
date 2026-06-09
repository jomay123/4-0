import { useCallback, useEffect, useMemo, useState } from 'react';
import { CategorySlot } from './components/CategorySlot';
import { DraftBoard } from './components/DraftBoard';
import { PlayerList } from './components/PlayerList';
import { Results } from './components/Results';
import { loadTopGolfers } from './lib/datagolf';
import { pickRandomCategory, pickRandomGolfers } from './lib/draft';
import { simulateSeason } from './lib/simulation';
import type {
  DraftCategory,
  DraftPick,
  GameMode,
  GamePhase,
  Golfer,
  SeasonResult,
} from './types';
import { DRAFT_OPTIONS, DRAFT_ROUNDS, MAX_REROLLS } from './types';
import './App.css';

const API_KEY = import.meta.env.VITE_DATAGOLF_API_KEY as string | undefined;

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('welcome');
  const [mode, setMode] = useState<GameMode>('classic');
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [dataSource, setDataSource] = useState<'datagolf' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);

  const [draftRound, setDraftRound] = useState(0);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [currentCategory, setCurrentCategory] = useState<DraftCategory | null>(null);
  const [draftOptions, setDraftOptions] = useState<Golfer[]>([]);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<DraftCategory | null>(null);
  const [canPick, setCanPick] = useState(false);
  const [rerollsLeft, setRerollsLeft] = useState(MAX_REROLLS);
  const [season, setSeason] = useState<SeasonResult | null>(null);

  const draftedIds = useMemo(() => new Set(picks.map((p) => p.golfer.dg_id)), [picks]);
  const availableGolfers = useMemo(
    () => golfers.filter((g) => !draftedIds.has(g.dg_id)),
    [golfers, draftedIds],
  );

  useEffect(() => {
    loadTopGolfers(50, API_KEY).then(({ golfers: data, source }) => {
      setGolfers(data);
      setDataSource(source);
      setLoading(false);
    });
  }, []);

  const resetGame = useCallback(() => {
    setPhase('welcome');
    setDraftRound(0);
    setPicks([]);
    setCurrentCategory(null);
    setDraftOptions([]);
    setSlotSpinning(false);
    setSlotResult(null);
    setCanPick(false);
    setRerollsLeft(MAX_REROLLS);
    setSeason(null);
  }, []);

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setPhase('draft');
    setDraftRound(1);
    setPicks([]);
    setCurrentCategory(null);
    setDraftOptions([]);
    setCanPick(false);
    setSlotSpinning(false);
    setSlotResult(null);
    setRerollsLeft(MAX_REROLLS);
  };

  const spinSlot = () => {
    const usedCategories = picks.map((p) => p.category);
    const result = pickRandomCategory(usedCategories);
    setSlotSpinning(true);
    setSlotResult(result);
    setCanPick(false);
    setDraftOptions([]);
  };

  const onSlotComplete = () => {
    setSlotSpinning(false);
    if (slotResult) {
      setCurrentCategory(slotResult);
      setDraftOptions(pickRandomGolfers(availableGolfers, DRAFT_OPTIONS));
      setCanPick(true);
    }
  };

  const handleReroll = () => {
    if (!canPick || rerollsLeft <= 0) return;
    setDraftOptions(pickRandomGolfers(availableGolfers, DRAFT_OPTIONS));
    setRerollsLeft((r) => r - 1);
  };

  const handlePick = (golfer: Golfer) => {
    if (!currentCategory || !canPick) return;

    const newPick: DraftPick = {
      round: draftRound,
      category: currentCategory,
      golfer,
    };

    const newPicks = [...picks, newPick];
    setPicks(newPicks);
    setCanPick(false);
    setCurrentCategory(null);
    setDraftOptions([]);
    setSlotResult(null);

    if (draftRound >= DRAFT_ROUNDS) {
      setPhase('simulating');
      window.setTimeout(() => {
        const result = simulateSeason(newPicks, golfers);
        setSeason(result);
        setPhase('results');
      }, 1800);
      return;
    }

    setDraftRound((r) => r + 1);
  };

  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loader" />
        <p>Loading top 50 golfers…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-num">4</span>
            <span className="logo-dash">/</span>
            <span className="logo-num">4</span>
          </div>
          <p className="tagline">Build a composite golfer. Win all four majors.</p>
        </div>
        <div className="data-badge">
          {dataSource === 'datagolf' ? 'Live DataGolf' : 'DataGolf-style ratings'}
        </div>
      </header>

      <main className="main">
        {phase === 'welcome' && (
          <section className="welcome">
            <h1>Can your composite golfer win the Grand Slam?</h1>
            <p className="welcome-desc">
              Inspired by 82-0 and 38-0. Draft four skill specialists from the top 50,
              merge them into one composite player, then play out a full PGA season.
              The goal: win all four majors.
            </p>

            <div className="mode-cards">
              <button type="button" className="mode-card" onClick={() => startGame('classic')}>
                <h3>Classic</h3>
                <p>Full SG stats visible — make informed picks.</p>
              </button>
              <button type="button" className="mode-card expert" onClick={() => startGame('expert')}>
                <h3>Expert</h3>
                <p>Ratings hidden. Draft on golf knowledge alone.</p>
              </button>
            </div>

            <div className="how-to">
              <h4>How it works</h4>
              <ol>
                <li>Pull the slot machine to land on a skill category (OTT, APP, ARG, or PUTT).</li>
                <li>Choose 1 of 5 random golfers — their skill joins your composite.</li>
                <li>Complete 4 rounds. Total SG is the sum of all four skills.</li>
                <li>You get one reroll per game to redraw your 5 options.</li>
                <li>Simulate a full season — 16 events including all four majors.</li>
                <li>Goal: win the Masters, PGA, U.S. Open, and The Open (4/4).</li>
              </ol>
            </div>
          </section>
        )}

        {phase === 'draft' && (
          <section className="draft-phase">
            <div className="draft-top">
              <div className="round-indicator">
                <span className="round-label">Round</span>
                <span className="round-num">{draftRound}</span>
                <span className="round-of">/ {DRAFT_ROUNDS}</span>
              </div>
              <DraftBoard picks={picks} />
            </div>

            <div className="draft-center">
              {!currentCategory && !slotSpinning && (
                <button type="button" className="btn btn-primary btn-large slot-btn" onClick={spinSlot}>
                  Pull the Lever
                </button>
              )}

              {(slotSpinning || slotResult) && (
                <CategorySlot
                  spinning={slotSpinning}
                  result={slotResult}
                  onSpinComplete={onSlotComplete}
                />
              )}
            </div>

            {currentCategory && canPick && draftOptions.length > 0 && (
              <PlayerList
                golfers={draftOptions}
                category={currentCategory}
                mode={mode}
                onSelect={handlePick}
                onReroll={handleReroll}
                rerollsLeft={rerollsLeft}
              />
            )}
          </section>
        )}

        {phase === 'simulating' && (
          <section className="simulating">
            <div className="sim-animation">
              <div className="golf-ball" />
            </div>
            <h2>Simulating season…</h2>
            <p>16 tournaments · chasing the Grand Slam</p>
          </section>
        )}

        {phase === 'results' && season && (
          <Results season={season} mode={mode} onPlayAgain={resetGame} />
        )}
      </main>

      <footer className="footer">
        <p>
          Player data modeled on{' '}
          <a href="https://datagolf.com" target="_blank" rel="noreferrer">
            DataGolf
          </a>{' '}
          strokes-gained rankings. Not affiliated with DataGolf or the PGA Tour.
        </p>
      </footer>
    </div>
  );
}
