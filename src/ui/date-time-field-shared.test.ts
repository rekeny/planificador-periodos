// T089: the plumbing of the date and time field (RF-083, E-033). ADDED_TIME is the time «Añadir hora»
// gives a match that has none; toLocalDate only feeds the date picker now.
import { ADDED_TIME, toLocalDate } from "@/ui/date-time-field-shared";

describe("date-time-field-shared", () => {
  it("RF-083 E-033: ADDED_TIME is 12:00", () => {
    expect(ADDED_TIME).toEqual({ hour: 12, minute: 0 });
  });

  it("RF-083: toLocalDate keeps the noon fallback for the date picker and uses a given time as it is", () => {
    expect(toLocalDate("2026-03-01", null)).toEqual(
      new Date(2026, 2, 1, 12, 0),
    );
    expect(toLocalDate("2026-03-01", "18:30")).toEqual(
      new Date(2026, 2, 1, 18, 30),
    );
  });
});
