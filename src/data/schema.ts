import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// The five tables of the plan ("Data"). Every foreign key deletes with its parent.

export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    category: text("category"),
    defaultFormat: integer("default_format").notNull(),
  },
  (table) => [
    check(
      "teams_default_format_check",
      sql`${table.defaultFormat} in (4, 6, 8)`,
    ),
  ],
);

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  number: text("number").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    format: integer("format").notNull(),
    date: text("date").notNull(),
    time: text("time"),
    homeName: text("home_name"),
    awayName: text("away_name"),
    notes: text("notes"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    overtimeCount: integer("overtime_count").notNull().default(0),
  },
  (table) => [
    check("matches_format_check", sql`${table.format} in (4, 6, 8)`),
    check(
      "matches_scores_check",
      sql`(${table.homeScore} is null) = (${table.awayScore} is null)`,
    ),
    index("matches_team_id_idx").on(table.teamId),
    index("matches_date_time_idx").on(table.date, table.time),
  ],
);

export const callUpEntries = sqliteTable(
  "call_up_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    playerName: text("player_name").notNull(),
    playerNumber: text("player_number").notNull(),
  },
  (table) => [
    uniqueIndex("call_up_entries_match_id_player_id_unique").on(
      table.matchId,
      table.playerId,
    ),
  ],
);

export const marks = sqliteTable(
  "marks",
  {
    callUpEntryId: integer("call_up_entry_id")
      .notNull()
      .references(() => callUpEntries.id, { onDelete: "cascade" }),
    columnKind: text("column_kind").notNull(),
    columnNumber: integer("column_number").notNull(),
    mark: text("mark").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.callUpEntryId, table.columnKind, table.columnNumber],
    }),
    check(
      "marks_column_kind_check",
      sql`${table.columnKind} in ('period', 'overtime')`,
    ),
    check("marks_mark_check", sql`${table.mark} in ('starter', 'sub')`),
  ],
);
