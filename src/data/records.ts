/**
 * Plain rows as the repositories return them (review P-01). Formats are plain numbers here:
 * the state layer narrows them with the domain's `isFormat` and sorts with the domain comparators.
 */

export interface TeamRecord {
  readonly id: number;
  readonly name: string;
  readonly category: string | null;
  readonly defaultFormat: number;
}

export interface PlayerRecord {
  readonly id: number;
  readonly teamId: number;
  readonly name: string;
  readonly number: string;
  readonly isActive: boolean;
}

export interface MatchRecord {
  readonly id: number;
  readonly teamId: number;
  readonly format: number;
  readonly date: string;
  readonly time: string | null;
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly notes: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly overtimeCount: number;
}

/** One stay of a player in a match's call-up, with the name and number as they were (RF-019). */
export interface CallUpEntryRecord {
  readonly id: number;
  readonly matchId: number;
  readonly playerId: number;
  readonly playerName: string;
  readonly playerNumber: string;
}

export interface MarkRecord {
  readonly callUpEntryId: number;
  readonly columnKind: string;
  readonly columnNumber: number;
  readonly mark: string;
}
