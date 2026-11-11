import { configureGlobal } from "fast-check";

// Normal Jest runs: every property runs 1,000 times. Properties never set `numRuns` themselves.
configureGlobal({ numRuns: 1000 });
