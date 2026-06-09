/** Tunable simulation parameters — balanced so a Grand Slam is rare but achievable. */
export const SIM_CONFIG = {
  /** Round-to-round scoring noise for tour field players. */
  fieldNoiseStd: 1.15,
  /** Composite gets tighter variance — built from specialists, more consistent. */
  compositeNoiseStd: 0.78,
  /** Random course difficulty per event. */
  courseDiffStd: 0.32,
  /** Extra difficulty on majors. */
  majorDiffBonus: 0.35,
  /** How many tour players in each field (sampled from pool). */
  fieldSize: 32,
  /** Share of field making the cut after 36 holes. */
  cutPct: 0.65,
} as const;
