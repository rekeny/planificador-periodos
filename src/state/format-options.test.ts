// T032: the format options and the format a new team starts with (RF-001, RF-013).
import { FORMATS } from "@/domain/format";
import { NEW_TEAM_DEFAULT_FORMAT, formatOptions } from "@/state/format-options";

describe("format options", () => {
  it("RF-001: the options are exactly 4, 6 and 8, in that order, the formats of the domain", () => {
    expect(formatOptions).toEqual([4, 6, 8]);
    expect(formatOptions).toEqual(FORMATS);
  });

  it("RF-001 RF-013: a new team starts with 6 periods, one of the options offered", () => {
    expect(NEW_TEAM_DEFAULT_FORMAT).toBe(6);
    expect(formatOptions).toContain(NEW_TEAM_DEFAULT_FORMAT);
  });
});
