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
