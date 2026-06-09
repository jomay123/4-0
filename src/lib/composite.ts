import { getSkillValue } from './draft';
import type { CompositePlayer, DraftPick } from '../types';

/** Merge each drafted category specialist into one simulated golfer. */
export function buildCompositePlayer(picks: DraftPick[]): CompositePlayer {
  const parts = picks.map((pick) => ({
    category: pick.category,
    golferName: pick.golfer.player_name,
    value: getSkillValue(pick.golfer, pick.category),
  }));

  const sg_ott = parts.find((p) => p.category === 'sg_ott')?.value ?? 0;
  const sg_app = parts.find((p) => p.category === 'sg_app')?.value ?? 0;
  const sg_arg = parts.find((p) => p.category === 'sg_arg')?.value ?? 0;
  const sg_putt = parts.find((p) => p.category === 'sg_putt')?.value ?? 0;
  const sg_total = sg_ott + sg_app + sg_arg + sg_putt;

  const initials = picks
    .map((p) => p.golfer.player_name.split(' ').at(-1)?.slice(0, 1) ?? '')
    .join('');

  return {
    player_name: initials ? `Composite ${initials}` : 'Your Golfer',
    sg_ott,
    sg_app,
    sg_arg,
    sg_putt,
    sg_total,
    parts,
  };
}
