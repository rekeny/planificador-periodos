// Types of the squad: team, player and match (RF-016, RF-019). Types only, no behaviour.
import type { Format } from "@/domain/format";

export type TeamId = number;
export type PlayerId = number;
export type MatchId = number;

export interface Team {
  readonly id: TeamId;
  readonly name: string;
  readonly category: string | null;
  readonly defaultFormat: Format;
}

export interface Player {
  readonly id: PlayerId;
  readonly teamId: TeamId;
  readonly name: string;
  readonly number: string; // "0"–"99" and "00"; "0" !== "00" (RF-016)
  readonly isActive: boolean;
}

export interface Match {
  readonly id: MatchId;
  readonly teamId: TeamId;
  readonly format: Format;
  readonly date: string; //          YYYY-MM-DD
  readonly time: string | null; //   HH:MM, 24 hours; a new match has none
  readonly homeName: string | null;
  readonly awayName: string | null;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly notes: string | null;
  readonly overtimeCount: number;
}
