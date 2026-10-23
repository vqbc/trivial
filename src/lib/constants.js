/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const AOPS_API = "https://artofproblemsolving.com/wiki/api.php";
export const AOPS_WIKI = "https://artofproblemsolving.com/wiki/index.php/";

export const TESTS = [
  "AMC 8",
  "AMC 10",
  "AMC 12",
  "AIME",
  "USAJMO",
  "USAMO",
  "IMO",
  "AJHSME",
  "AHSME",
];

// College tournaments served from public/data/tournaments/ (built by
// buildtournaments.js) instead of the AoPS wiki. Keys are the test
// names used in problem titles; values are the rounds, which act as
// versions ("2018 BMT Algebra Problems/Problem 3"). Each problem
// carries its own difficulty and subject (see lib/tournaments.js).
export const TOURNAMENTS = {
  "HMMT February": [
    "Algebra",
    "Algebra and Calculus",
    "Algebra and Combinatorics",
    "Algebra and Geometry",
    "Algebra and Number Theory",
    "Geometry",
    "Combinatorics",
    "Combinatorics and Geometry",
    "Calculus",
    "Calculus and Combinatorics",
    "Calculus and Geometry",
    "Advanced Topics",
    "General",
    "General 1",
    "General 2",
    "Team",
    "Team B",
    "Guts",
  ],
  "HMMT November": ["General", "General 1", "General 2", "Theme", "Team", "Guts"],
  PUMaC: [
    "Algebra A",
    "Algebra B",
    "Geometry A",
    "Geometry B",
    "Combinatorics A",
    "Combinatorics B",
    "Number Theory A",
    "Number Theory B",
    "Team",
    "Live",
  ],
  SMT: [
    "Algebra",
    "Algebra Tiebreaker",
    "Geometry",
    "Geometry Tiebreaker",
    "Combinatorics",
    "Combinatorics Tiebreaker",
    "Number Theory",
    "Number Theory Tiebreaker",
    "Calculus",
    "Calculus Tiebreaker",
    "Discrete",
    "Discrete Tiebreaker",
    "Advanced Topics",
    "Advanced Topics Tiebreaker",
    "General",
    "General Tiebreaker",
    "Team",
    "Guts",
  ],
  BMT: [
    "Algebra",
    "Algebra Tiebreaker",
    "Geometry",
    "Geometry Tiebreaker",
    "Combinatorics",
    "Combinatorics Tiebreaker",
    "Number Theory",
    "Number Theory Tiebreaker",
    "Calculus",
    "Calculus Tiebreaker",
    "Discrete",
    "Discrete Tiebreaker",
    "Analysis",
    "Analysis Tiebreaker",
    "General",
    "General Tiebreaker",
    "Individual",
    "Individual Tiebreaker",
    "Team",
    "Guts",
    "Tournament",
  ],
  CMIMC: [
    "Algebra",
    "Algebra Division 1",
    "Algebra Division 2",
    "Geometry",
    "Geometry Division 1",
    "Geometry Division 2",
    "Combinatorics",
    "Combinatorics Division 1",
    "Combinatorics Division 2",
    "Number Theory",
    "Team",
    "Tiebreaker",
  ],
  CMWMC: ["Individual", "Guts", "Relay"],
  CMM: [
    "Individual",
    "Individual (Fall)",
    "Individual (Spring)",
    "Individual (Winter)",
    "Team",
    "Team (Fall)",
    "Team (Spring)",
    "Team (Winter)",
    "Mixer",
    "Mixer (Fall)",
    "Mixer (Spring)",
    "Mixer (Winter)",
    "Tiebreaker",
    "Tiebreaker (Fall)",
    "Tiebreaker (Spring)",
    "Tiebreaker (Winter)",
  ],
  DMM: ["Individual", "Team", "Guts", "Relay", "Devil", "Tiebreaker"],
  MMATHS: ["Individual", "Team", "Guts", "Tiebreaker", "Lightning Finals"],
  GiM: ["Individual", "Team", "Guts", "Tiebreaker"],
};

export const TOURNAMENT_TESTS = Object.keys(TOURNAMENTS);

// Tagify whitelist for Tests in Random Practice / Random Sets — adds
// the legacy "(AMC Tests)" meta-token that expands to AHSME + AMC 8/
// 10/12 + AIME + USAMO + IMO (see matchesOptions in lib/problems.js).
// Select tabs use TESTS directly since "(AMC Tests)" isn't a real
// single test.
export const TEST_WHITELIST = ["(AMC Tests)", ...TESTS, ...TOURNAMENT_TESTS];

// TESTS with the tournaments added, for Practice's Select tab. Problem
// Sets' Past Test tab keeps the AoPS-only list for now.
export const PRACTICE_TESTS = [...TESTS, ...TOURNAMENT_TESTS];

// Filter default used when the user clears all tests — pulls from every
// test (matchesOptions recognizes the "(All Tests)" meta-token).
export const DEFAULT_TESTS = ["(All Tests)"];

export const VALID_VERSIONS = {
  "AMC 10": ["A", "B", "Fall A", "Fall B", "P"],
  "AMC 12": ["A", "B", "Fall A", "Fall B", "P"],
  AIME: ["I", "II"],
};

export const VALID_YEARS = {
  "AMC 8": { min: 1999, max: 2026 },
  "AMC 10": { min: 2000, max: 2001 },
  "AMC 10A": { min: 2002, max: 2025 },
  "AMC 10B": { min: 2002, max: 2025 },
  "AMC 10Fall A": { min: 2021, max: 2021 },
  "AMC 10Fall B": { min: 2021, max: 2021 },
  "AMC 10P": { min: 2002, max: 2002 },
  "AMC 12": { min: 2000, max: 2001 },
  "AMC 12A": { min: 2002, max: 2025 },
  "AMC 12B": { min: 2002, max: 2025 },
  "AMC 12Fall A": { min: 2021, max: 2021 },
  "AMC 12Fall B": { min: 2021, max: 2021 },
  "AMC 12P": { min: 2002, max: 2002 },
  AIME: { min: 1983, max: 1999 },
  AIMEI: { min: 2000, max: 2026 },
  AIMEII: { min: 2000, max: 2026 },
  USAJMO: { min: 2010, max: 2026 },
  USAMO: { min: 1972, max: 2026 },
  IMO: { min: 1959, max: 2026 },
  AJHSME: { min: 1985, max: 1998 },
  AHSME: { min: 1950, max: 1999 },
};

export const VALID_NUMS = {
  "AMC 8": { min: 1, max: 25 },
  "AMC 10": { min: 1, max: 25 },
  "AMC 12": { min: 1, max: 25 },
  AIME: { min: 1, max: 15 },
  USAJMO: { min: 1, max: 6 },
  USAMO: { min: 1, max: 6 },
  IMO: { min: 1, max: 6 },
  AJHSME: { min: 1, max: 25 },
  // 50 problems through 1959, 40 through 1967, 35 through 1973, then 30.
  AHSME: { min: 1, max: 50 },
};

export const YEAR_MIN = 1950;
export const YEAR_MAX = 2026;
// Default lower bound for the Random year-range slider. The upper
// bound defaults to the current year.
export const DEFAULT_YEAR_MIN = 2010;
export const DIFFICULTY_MIN = 0;
export const DIFFICULTY_MAX = 10;

// Subject categories used to narrow Random batches. `value` is the
// AoPS wiki category page name (used to query the API); `label` is the
// short text shown on the chip.
export const SUBJECTS = [
  { value: "3D Geometry Problems", label: "3D Geo" },
  { value: "Introductory Algebra Problems", label: "Intro Alg" },
  { value: "Introductory Combinatorics Problems", label: "Intro Combo" },
  { value: "Introductory Geometry Problems", label: "Intro Geo" },
  { value: "Introductory Number Theory Problems", label: "Intro NT" },
  { value: "Introductory Probability Problems", label: "Intro Prob" },
  { value: "Introductory Trigonometry Problems", label: "Intro Trig" },
  { value: "Intermediate Algebra Problems", label: "Int Alg" },
  { value: "Intermediate Combinatorics Problems", label: "Int Combo" },
  { value: "Intermediate Geometry Problems", label: "Int Geo" },
  { value: "Intermediate Number Theory Problems", label: "Int NT" },
  { value: "Intermediate Probability Problems", label: "Int Prob" },
  { value: "Intermediate Trigonometry Problems", label: "Int Trig" },
  { value: "Olympiad Algebra Problems", label: "Oly Alg" },
  { value: "Olympiad Combinatorics Problems", label: "Oly Combo" },
  { value: "Olympiad Geometry Problems", label: "Oly Geo" },
  { value: "Olympiad Inequality Problems", label: "Oly Ineq" },
  { value: "Olympiad Number Theory Problems", label: "Oly NT" },
  { value: "Olympiad Trigonometry Problems", label: "Oly Trig" },
];
