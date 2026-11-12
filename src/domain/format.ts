// Formats and their rule windows as data (RF-001 to RF-006).

export type Format = 4 | 6 | 8;

export interface RuleWindow {
  readonly periodCount: number; // 3 | 5 | 6 (RF-002)
  readonly minPlayed: number; //   1 | 2 | 2 (RF-003)
  readonly minRested: number; //   1 | 2 | 2 (RF-004)
}

export interface FormatRules {
  readonly periodCount: number; // 4 | 6 | 8
  readonly ruleWindow: RuleWindow;
  readonly callUpMin: number; //   8 | 9 | 8 (RF-005)
  readonly callUpMax: number; //   12 (RF-005)
}

export const FORMATS: readonly Format[] = [4, 6, 8];

export const FORMAT_RULES: Readonly<Record<Format, FormatRules>> = {
  4: {
    periodCount: 4,
    ruleWindow: { periodCount: 3, minPlayed: 1, minRested: 1 },
    callUpMin: 8,
    callUpMax: 12,
  },
  6: {
    periodCount: 6,
    ruleWindow: { periodCount: 5, minPlayed: 2, minRested: 2 },
    callUpMin: 9,
    callUpMax: 12,
  },
  8: {
    periodCount: 8,
    ruleWindow: { periodCount: 6, minPlayed: 2, minRested: 2 },
    callUpMin: 8,
    callUpMax: 12,
  },
};

export const MAX_STARTERS_PER_PERIOD = 5; // RF-055

export function isFormat(value: number): value is Format {
  return (FORMATS as readonly number[]).includes(value);
}
