import { configureGlobal } from "fast-check";

// Stryker runs: every property runs 100 times, to keep mutation testing within the CI limit.
configureGlobal({ numRuns: 100 });
