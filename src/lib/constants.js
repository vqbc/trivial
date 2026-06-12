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

// Tagify whitelist for Tests in Random Practice / Random Sets — adds
// the legacy "(AMC Tests)" meta-token that expands to AHSME + AMC 8/
// 10/12 + AIME + USAMO + IMO (see matchesOptions in lib/problems.js).
// Select tabs use TESTS directly since "(AMC Tests)" isn't a real
// single test.
export const TEST_WHITELIST = ["(AMC Tests)", ...TESTS];

// Filter default used when the user clears all tests.
export const DEFAULT_TESTS = ["(AMC Tests)"];

export const VALID_VERSIONS = {
  "AMC 10": ["A", "B", "Fall A", "Fall B"],
  "AMC 12": ["A", "B", "Fall A", "Fall B"],
  AIME: ["I", "II"],
};

export const VALID_YEARS = {
  "AMC 8": { min: 1999, max: 2026 },
  "AMC 10": { min: 2000, max: 2001 },
  "AMC 10A": { min: 2002, max: 2025 },
  "AMC 10B": { min: 2002, max: 2025 },
  "AMC 10Fall A": { min: 2021, max: 2021 },
  "AMC 10Fall B": { min: 2021, max: 2021 },
  "AMC 12": { min: 2000, max: 2001 },
  "AMC 12A": { min: 2002, max: 2025 },
  "AMC 12B": { min: 2002, max: 2025 },
  "AMC 12Fall A": { min: 2021, max: 2021 },
  "AMC 12Fall B": { min: 2021, max: 2021 },
  AIME: { min: 1983, max: 1999 },
  AIMEI: { min: 2000, max: 2026 },
  AIMEII: { min: 2000, max: 2026 },
  USAJMO: { min: 2010, max: 2026 },
  USAMO: { min: 1972, max: 2026 },
  IMO: { min: 1959, max: 2025 },
  AJHSME: { min: 1985, max: 1998 },
  AHSME: { min: 1974, max: 1999 },
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
  AHSME: { min: 1, max: 30 },
};

export const YEAR_MIN = 1959;
export const YEAR_MAX = 2026;
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
