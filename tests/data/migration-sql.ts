/// <reference types="node" />
// Helpers of the tests that read the generated SQL of src/data/migrations (T027). This file holds
// no test calls. The SQL is read at run time from the real folder and normalised, so the tests do
// not depend on the spacing or the quoting style that drizzle-kit writes.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REAL_MIGRATIONS } from "../scripts/bundle-migrations-fixtures";

export const TABLES = [
  "teams",
  "players",
  "matches",
  "call_up_entries",
  "marks",
] as const;

/** The text of every `.sql` file of the migration folder, in file order; "" if there is none. */
export function readSql(): string {
  if (!existsSync(REAL_MIGRATIONS)) return "";
  return readdirSync(REAL_MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(REAL_MIGRATIONS, name), "utf8"))
    .join("\n");
}

/** Lower case, without quotes, backticks or any whitespace: `CHECK("a" IN (1, 2))` is `check(ain(1,2))`. */
export function squash(text: string): string {
  return text.toLowerCase().replace(/[`"\s]/g, "");
}

/** The body of `CREATE TABLE <name> (...)`, as written; undefined when the table is not created. */
export function tableBody(sql: string, name: string): string | undefined {
  const match = new RegExp(
    `CREATE TABLE [\`"]?${name}[\`"]? \\(([\\s\\S]*?)\\n?\\);`,
    "i",
  ).exec(sql);
  return match?.[1];
}

/** The items of a table body, split at the commas that are not inside parentheses. */
export function tableItems(body: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const character of body) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  items.push(current.trim());
  return items.filter((item) => item !== "");
}

const NOT_COLUMNS = /^(primary key|foreign key|constraint|unique|check)/i;

/** The column definitions of a table, by column name, normalised with `squash`-free spacing. */
export function columnsOf(sql: string, table: string): Map<string, string> {
  const columns = new Map<string, string>();
  for (const item of tableItems(tableBody(sql, table) ?? "")) {
    if (NOT_COLUMNS.test(item)) continue;
    const [name = "", ...rest] = item.replace(/[`"]/g, "").split(/\s+/);
    columns.set(name, rest.join(" ").toLowerCase());
  }
  return columns;
}

/** The whole body of a table, squashed; "" when the table is not created. */
export function squashedTable(sql: string, table: string): string {
  return squash(tableBody(sql, table) ?? "");
}

/** The table-level items (keys, foreign keys, checks), squashed. */
export function constraintsOf(sql: string, table: string): string[] {
  return tableItems(tableBody(sql, table) ?? "")
    .filter((item) => NOT_COLUMNS.test(item))
    .map(squash);
}
