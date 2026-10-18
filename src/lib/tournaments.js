/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import katex from "katex";
import { TOURNAMENT_TESTS } from "./constants.js";
import { formatLatex } from "./latex.js";

// College tournament problems come from the bundled archive under
// public/data/tournaments/ (see buildtournaments.js for the layout)
// rather than the AoPS wiki. Their titles follow the wiki's shape —
// "2018 BMT Algebra Problems/Problem 3" — so they share the problem
// universe, history, and ?page= URLs with wiki problems; lib/aops.js
// routes any title found in the tournament index here.

const DATA_URL = "/data/tournaments";

const TITLE = new RegExp(
  `^(\\d{4} (?:${TOURNAMENT_TESTS.join("|")}) .*) Problems/Problem (\\d+)$`,
);

// "2018 BMT Algebra Problems/Problem 3" (spaced or underscored) →
// { test: "2018 BMT Algebra", number: 3 }, or null when the title
// can't be a tournament problem.
function splitTitle(pagename) {
  const m = pagename.replace(/_/g, " ").match(TITLE);
  return m ? { test: m[1], number: Number(m[2]) } : null;
}

// index.json: { "2018 BMT Algebra": { "1": [2, "algebra"], ... }, ... }
// — the difficulty (AoPS scale) and subject of each problem by test.
// Estimation and similar problems are left out, so there can be gaps.
// `loadedIndex` keeps the resolved data so tournamentDifficulty can
// read it synchronously.
let indexPromise = null;
let loadedIndex = null;

function fetchIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${DATA_URL}/index.json`)
      .then((r) => r.json())
      .then((data) => (loadedIndex = data));
  }
  return indexPromise;
}

// [difficulty, subject] of a tournament problem, once the index is in.
function rating(pagename) {
  const parts = splitTitle(pagename);
  return (parts && loadedIndex?.[parts.test]?.[parts.number]) ?? null;
}

// Round files keyed by test ("2018 BMT Algebra"). `rounds` keeps the
// resolved data so tournamentSource can read it synchronously.
const roundPromises = new Map();
const rounds = new Map();

function fetchRound(test) {
  if (!roundPromises.has(test)) {
    roundPromises.set(
      test,
      fetch(`${DATA_URL}/${test.replace(/ /g, "_")}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((round) => {
          rounds.set(test, round);
          return round;
        }),
    );
  }
  return roundPromises.get(test);
}

async function fetchEntry(pagename) {
  const parts = splitTitle(pagename);
  if (!parts) return null;
  const round = await fetchRound(parts.test);
  const entry = round?.problems?.[parts.number];
  return entry ? { ...parts, entry } : null;
}

// Wiki-style titles of every tournament problem, for the Random tab
// universe (see fetchAllProblems in lib/aops.js).
export async function fetchTournamentProblems() {
  const index = await fetchIndex();
  const titles = [];
  for (const [test, problems] of Object.entries(index)) {
    for (const n of Object.keys(problems)) titles.push(`${test} Problems/Problem ${n}`);
  }
  return titles;
}

export async function isTournamentProblem(pagename) {
  await fetchIndex();
  return rating(pagename) !== null;
}

// Difficulty on the same scale as computeDifficulty (lib/problems.js),
// or -1 like computeDifficulty when it isn't known. Synchronous: the
// index is loaded by fetchTournamentProblems / isTournamentProblem
// before any tournament title reaches the filters.
export function tournamentDifficulty(pagename) {
  return rating(pagename)?.[0] ?? -1;
}

// The archive's subjects, mapped onto the wiki categories behind the
// subject filter (SUBJECTS in lib/constants.js). The level comes from
// the difficulty: below 3 is Introductory, up to 6.5 (late AIME) is
// Intermediate, and above that Olympiad. Calculus has no category, so
// those problems only come up with no subject chosen.
const CATEGORY_SUBJECTS = {
  algebra: "Algebra",
  geometry: "Geometry",
  combinatorics: "Combinatorics",
  "number-theory": "Number Theory",
};

function category(difficulty, subject) {
  const name = CATEGORY_SUBJECTS[subject];
  if (!name) return null;
  const level =
    difficulty < 3 ? "Introductory" : difficulty <= 6.5 ? "Intermediate" : "Olympiad";
  return `${level} ${name} Problems`;
}

// Tournament titles in a subject category ("Intermediate Geometry
// Problems"), alongside fetchCategoryPages in lib/aops.js.
export async function fetchTournamentCategoryPages(subject) {
  const index = await fetchIndex();
  const titles = [];
  for (const [test, problems] of Object.entries(index)) {
    for (const [n, [difficulty, subj]] of Object.entries(problems)) {
      if (category(difficulty, subj) === subject) {
        titles.push(`${test} Problems/Problem ${n}`);
      }
    }
  }
  return titles;
}

// Renders the \( ... \) and \[ ... \] left by buildtournaments.js
// through KaTeX with the same normalization as wiki pages. The hidden
// fallback-container span keeps sourceCleanup's history snippets
// working, as it does for the wiki's <img class="latex"> markup. Also
// used for the bundled AoPS problems (lib/aopsarchive.js).
export function renderMath(html) {
  return html.replace(
    /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g,
    (match, display, inline) => {
      const isDisplay = display !== undefined;
      const rendered = katex.renderToString(
        formatLatex(isDisplay ? display : inline),
        { throwOnError: false, displayMode: isDisplay },
      );
      return (
        `<span class="fallback-container">${match}</span>` +
        `<katex class="katex-container">${rendered}</katex>`
      );
    },
  );
}

// Same shape as fetchProblemPage in lib/aops.js.
export async function fetchTournamentProblem(pagename) {
  const found = await fetchEntry(pagename);
  if (!found) return null;
  return {
    problem: renderMath(found.entry.problem),
    solutions: renderMath(found.entry.solutions),
    finalPage: `${found.test} Problems/Problem ${found.number}`,
  };
}

// The official answer in the form AnswerCheck compares against
// (uppercase, no spaces), or null when there's no answer or it isn't
// something a user could type (see normalizeAnswer).
export async function fetchTournamentAnswer(pagename) {
  const found = await fetchEntry(pagename);
  return found?.entry.answer ? normalizeAnswer(found.entry.answer) : null;
}

// Problems PDF for a tournament problem whose round has been loaded,
// else null. Synchronous so ProblemDisplay can use it while rendering.
export function tournamentSource(pagename) {
  const parts = splitTitle(pagename);
  return (parts && rounds.get(parts.test)?.url) ?? null;
}

// Content of the {...} group starting at s[i], and the index after it.
function readGroup(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

// Replaces every \name{a}{b}… (n brace arguments) with fn(a, b, …).
function replaceCommand(s, name, n, fn) {
  const re = new RegExp(`\\\\(?:${name})(?![a-zA-Z])\\s*`, "g");
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    let i = m.index + m[0].length;
    const args = [];
    for (let k = 0; k < n && s[i] === "{"; k++) {
      const [arg, end] = readGroup(s, i);
      args.push(arg);
      i = end;
    }
    if (args.length < n) continue;
    out += s.slice(last, m.index) + fn(...args);
    last = i;
    re.lastIndex = i;
  }
  return out + s.slice(last);
}

// Parenthesize a fraction part or exponent unless it's a single term.
const term = (s) => (/^-?[^+\-/^]*$/.test(s) ? s : `(${s})`);

// Turns answer LaTeX into typeable text: \frac{7\sqrt{3}}{3} →
// 7SQRT(3)/3, 2^{2025} → 2^2025, 120^\circ → 120, \text{Yes} → YES.
// Anything that doesn't reduce to plain characters (e.g. \sqrt[3]{2},
// \pm, set notation) gives null so no answer box is shown.
export function normalizeAnswer(tex) {
  // Worded answers and units ("3 feet/s", "Alan, Bob, and Dan") can't
  // be matched by exact comparison.
  if (/\\text\w*\{[^}]*[ /]/.test(tex)) return null;
  let s = tex
    .replace(/\\(?:left|right|displaystyle|quad|qquad)(?![a-zA-Z])/g, "")
    .replace(/\\[,;!: ]/g, "")
    .replace(/\^\{?\\circ\}?/g, "")
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "");
  for (const name of ["boxed", "text", "textbf", "mathrm", "mathbf", "operatorname"]) {
    s = replaceCommand(s, name, 1, (a) => a);
  }
  // Repeat so nested fractions and roots reduce from the outside in.
  let prev;
  do {
    prev = s;
    s = replaceCommand(s, "[dt]?frac", 2, (a, b) => `${term(a)}/${term(b)}`);
    s = replaceCommand(s, "sqrt", 1, (a) => `SQRT(${a})`);
  } while (s !== prev);
  s = s
    .replace(/\\pi(?![a-zA-Z])/g, "PI")
    .replace(/\\(?:cdot|times)(?![a-zA-Z])/g, "*")
    .replace(/([\^_])\{([^{}]*)\}/g, (_, op, x) => op + term(x))
    .replace(/[{}\s]/g, "")
    .toUpperCase();
  return /^[A-Z0-9()[\]+\-*/^.,;:=!|%']+$/.test(s) ? s : null;
}
