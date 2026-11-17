// Validation of the team and player forms (RF-013, RF-016, E-021).
// Returns the normalised value, the only one the state layer saves.

export type ValidationError =
  "nameRequired" | "numberInvalid" | "scoreIncomplete" | "scoreInvalid";

export type Validation<T> =
  | { readonly kind: "valid"; readonly value: T }
  | { readonly kind: "invalid"; readonly errors: readonly ValidationError[] };

// One digit, "00", or two digits not starting with 0. ASCII only, never trimmed.
const VALID_NUMBER = /^([0-9]|[1-9][0-9]|00)$/;

function result<T>(
  value: T,
  errors: readonly ValidationError[],
): Validation<T> {
  return errors.length === 0
    ? { kind: "valid", value }
    : { kind: "invalid", errors };
}

export function validateTeamInput(input: {
  readonly name: string;
  readonly category: string | null;
}): Validation<{ readonly name: string; readonly category: string | null }> {
  const name = input.name.trim();
  const category = input.category === null ? "" : input.category.trim();
  return result(
    { name, category: category === "" ? null : category },
    name === "" ? ["nameRequired"] : [],
  );
}

export function validatePlayerInput(input: {
  readonly name: string;
  readonly number: string;
}): Validation<{ readonly name: string; readonly number: string }> {
  const name = input.name.trim();
  const errors: ValidationError[] = [];
  if (name === "") {
    errors.push("nameRequired");
  }
  if (!VALID_NUMBER.test(input.number)) {
    errors.push("numberInvalid");
  }
  return result({ name, number: input.number }, errors);
}
