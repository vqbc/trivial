/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { renderMath } from "./tournaments.js";

// AMC 8/10/12, AIME, USAJMO, USAMO, IMO, AHSME and AJHSME problems come
// from a copy of the AoPS wiki pages bundled under public/data/aops/
// (see buildaops.js) rather than the wiki API. Titles are the wiki's
// own ("2022 AMC 10A Problems/Problem 3"), so history, ?page= URLs and
// the difficulty table work as before; lib/aops.js routes any title
// found in the index here, the way it does for lib/tournaments.js.

const DATA_URL = "/data/aops";

const TITLE = /^(\d{4} .+) Problems\/Problem (\d+)$/;

// Wiki titles of the contests above, whether or not the page is in the
// bundle — used to drop pages that aren't (mock and joke tests,
// misnumbered pages) from the wiki's problem list.
const CONTEST_TITLE =
  /^\d{4} (?:Fall )?(?:AMC (?:8|10[ABP]?|12[ABP]?)|AIME(?: I| II)?|USAJMO|USAMO|IMO|AHSME|AJHSME) Problems\/Problem \d+$/;

export const isArchiveContest = (title) => CONTEST_TITLE.test(title);

// "2022 AMC 10A Problems/Problem 3" (spaced or underscored) →
// { test: "2022 AMC 10A", number: 3 }, or null.
function splitTitle(pagename) {
  const m = pagename.replace(/_/g, " ").match(TITLE);
  return m ? { test: m[1], number: Number(m[2]) } : null;
}

// index.json: { "2022 AMC 10A": [1, 2, ..., 25], ... }. `loadedIndex`
// holds sets of the numbers once loaded, for inArchive.
let indexPromise = null;
let loadedIndex = null;

function fetchIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${DATA_URL}/index.json`)
      .then((r) => r.json())
      .then((data) => {
        loadedIndex = new Map(
          Object.entries(data).map(([test, nums]) => [test, new Set(nums)]),
        );
        return data;
      });
  }
  return indexPromise;
}

// Synchronous check, for callers that run after the index has loaded
// (any title that went through fetchProblemPage).
export function inArchive(pagename) {
  const parts = splitTitle(pagename);
  return Boolean(parts && loadedIndex?.get(parts.test)?.has(parts.number));
}

export async function isArchiveProblem(pagename) {
  await fetchIndex();
  return inArchive(pagename);
}

// Test files keyed by test ("2022 AMC 10A").
const testPromises = new Map();

function fetchTest(test) {
  if (!testPromises.has(test)) {
    testPromises.set(
      test,
      fetch(`${DATA_URL}/${test.replace(/ /g, "_")}.json`).then((r) =>
        r.ok ? r.json() : null,
      ),
    );
  }
  return testPromises.get(test);
}

async function fetchEntry(pagename) {
  const parts = splitTitle(pagename);
  if (!parts) return null;
  const entry = (await fetchTest(parts.test))?.problems?.[parts.number];
  return entry ? { ...parts, entry } : null;
}

// Wiki titles of every bundled problem, for the Random tab universe
// (see fetchAllProblems in lib/aops.js).
export async function fetchArchiveProblems() {
  const index = await fetchIndex();
  const titles = [];
  for (const [test, nums] of Object.entries(index)) {
    for (const n of nums) titles.push(`${test} Problems/Problem ${n}`);
  }
  return titles;
}

// Members of a wiki subject category ("Introductory Algebra Problems"),
// in place of the wiki's categorymembers query.
let categoriesPromise = null;

export async function fetchArchiveCategoryPages(subject) {
  if (!categoriesPromise) {
    categoriesPromise = fetch(`${DATA_URL}/categories.json`).then((r) => r.json());
  }
  return (await categoriesPromise)[subject] ?? [];
}

// Same shape as fetchProblemPage in lib/aops.js. Shared AMC 10/12
// problems redirect to one page, as on the wiki: `finalPage` is the
// page the title lands on.
export async function fetchArchiveProblem(pagename) {
  let found = await fetchEntry(pagename);
  if (found?.entry.page) found = await fetchEntry(found.entry.page);
  if (!found) return null;
  return {
    problem: renderMath(found.entry.problem),
    solutions: renderMath(found.entry.solutions),
    finalPage: `${found.test} Problems/Problem ${found.number}`,
  };
}

// The answer key entry, as fetchAnswer read it off the wiki's Answer Key
// page: the letter, or the AIME answer as three digits. Null for the
// olympiads, which have no answer key.
export async function fetchArchiveAnswer(pagename) {
  return (await fetchEntry(pagename))?.entry.answer ?? null;
}
