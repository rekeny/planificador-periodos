import { FORMATS } from "@/domain/format";
import type { Format } from "@/domain/format";

/** The formats the coach can pick (RF-001), as the domain defines them. */
export const formatOptions: readonly Format[] = FORMATS;

/** The format the new-team form starts with; the coach can change it (RF-013). */
export const NEW_TEAM_DEFAULT_FORMAT: Format = 6;
