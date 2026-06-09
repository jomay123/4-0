import type { DraftCategory, Golfer } from '../types';
import { DRAFT_CATEGORIES } from '../types';

export function getSkillValue(golfer: Golfer, category: DraftCategory): number {
  return golfer[category];
}

export function sortBySkill(golfers: Golfer[], category: DraftCategory): Golfer[] {
  return [...golfers].sort((a, b) => getSkillValue(b, category) - getSkillValue(a, category));
}

export function getCategoryMeta(category: DraftCategory) {
  return DRAFT_CATEGORIES.find((c) => c.key === category)!;
}

export function pickRandomCategory(exclude: DraftCategory[] = []): DraftCategory {
  const available = DRAFT_CATEGORIES.filter((c) => !exclude.includes(c.key));
  const pool = available.length > 0 ? available : DRAFT_CATEGORIES;
  return pool[Math.floor(Math.random() * pool.length)].key;
}

/** Pick N random undrafted golfers for the draft pool each round. */
export function pickRandomGolfers(pool: Golfer[], count: number): Golfer[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function formatSg(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

export function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    USA: '🇺🇸',
    ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    NIR: '🇬🇧',
    ESP: '🇪🇸',
    NOR: '🇳🇴',
    SWE: '🇸🇪',
    JPN: '🇯🇵',
    IRL: '🇮🇪',
    KOR: '🇰🇷',
    AUS: '🇦🇺',
    CAN: '🇨🇦',
    AUT: '🇦🇹',
    GER: '🇩🇪',
  };
  return flags[country] ?? '🏳️';
}
