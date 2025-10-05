export const PENALTY_CONFIG = {
  // Minutes before event start time when cancellation incurs penalty
  CANCELLATION_PENALTY_MINUTES: 60,

  // Whether penalty system is enabled
  PENALTY_ENABLED: true,
} as const;

export type PenaltyConfig = typeof PENALTY_CONFIG;
