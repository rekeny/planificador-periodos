import type { ValidationError } from "@/domain/squad-validation";

/**
 * What every action that writes returns (RF-085). `unchanged` means there was nothing to do and
 * nothing was written; it never means a failure.
 */
export type SaveResult =
  | { readonly kind: "saved" }
  | { readonly kind: "invalid"; readonly errors: readonly ValidationError[] }
  | { readonly kind: "saveFailed" }
  | { readonly kind: "unchanged" };
