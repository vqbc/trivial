/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AOPS_API, DEFAULT_TESTS } from "./constants.js";
import { latexer } from "./latex.js";
import { rewriteWikiLinks } from "./links.js";
import { getProblem, getSolutions } from "./parse.js";
import {
  fetchArchiveAnswer,
  fetchArchiveCategoryPages,
  fetchArchiveProblem,
  fetchArchiveProblems,
  isArchiveContest,
  isArchiveProblem,
} from "./aopsarchive.js";
import {
  matchesOptions,
  problemDifficulty,
  validProblem,
} from "./problems.js";
import {
  fetchTournamentAnswer,
  fetchTournamentCategoryPages,
  fetchTournamentProblem,
  fetchTournamentProblems,
  isTournamentProblem,
} from "./tournaments.js";

let problemsCache = null;
let problemsPromise = null;

export async function fetchAllProblems() {
  if (problemsCache) return problemsCache;
  if (!problemsPromise) {
    // The bundled tournament problems (lib/tournaments.js) join the
    // wiki list so the Random tabs can draw from both. The AMC, AIME,
    // USAMO and IMO pages come from the bundled copy (lib/aopsarchive.js)
    // instead of the wiki list.
    problemsPromise = Promise.all([
      fetch("/data/allproblems.json").then((r) => r.json()),
      fetchArchiveProblems(),
      fetchTournamentProblems(),
    ]).then(([wiki, archive, tournaments]) => [
      ...wiki.filter((t) => !isArchiveContest(t)),
      ...archive,
      ...tournaments,
    ]);
  }
  problemsCache = await problemsPromise;
  return problemsCache;
}

let pagesCache = null;
let pagesPromise = null;

export async function fetchAllPages() {
  if (pagesCache) return pagesCache;
  if (!pagesPromise) {
    pagesPromise = fetch("/data/allpages.json").then((r) => r.json());
  }
  pagesCache = await pagesPromise;
  return pagesCache;
}

// Cached lookup of AoPS Category:<subject> page lists, keyed by subject.
// Paginates through `cmcontinue` until the wiki stops returning more.
const categoryCache = new Map();

// Returns the set of problem titles matching the given options. When
// `subjects` is empty or contains "(All Subjects)", the universe is the
// preloaded allproblems.json. Otherwise it's the union of AoPS
// Category:<subject> pages, fetched per subject (cached).
export async function collectMatchingProblems({
  subjects,
  tests,
  yearRange,
  diffRange,
  universe,
}) {
  // Empty test list pulls from every test (see DEFAULT_TESTS).
  const effectiveTests = tests.length === 0 ? DEFAULT_TESTS : tests;
  const args = [
    effectiveTests,
    yearRange[0],
    yearRange[1],
    diffRange[0],
    diffRange[1],
  ];
  if (
    !subjects ||
    subjects.length === 0 ||
    subjects.includes("(All Subjects)")
  ) {
    return universe.filter((p) => matchesOptions(p, ...args));
  }
  const out = new Set();
  for (const subject of subjects) {
    const titles = [
      ...(await fetchArchiveCategoryPages(subject)),
      ...(await fetchTournamentCategoryPages(subject)),
    ];
    for (const t of titles) {
      if (validProblem(t) && matchesOptions(t, ...args)) out.add(t);
    }
  }
  return [...out];
}

export async function fetchCategoryPages(subject) {
  if (categoryCache.has(subject)) return categoryCache.get(subject);
  const titles = [];
  let cmcontinue = null;
  while (true) {
    const params =
      `action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(subject)}` +
      `&cmlimit=max&format=json&origin=*` +
      (cmcontinue ? `&cmcontinue=${encodeURIComponent(cmcontinue)}` : "");
    const res = await fetch(`${AOPS_API}?${params}`);
    const json = await res.json();
    for (const m of json?.query?.categorymembers ?? []) titles.push(m.title);
    if (!json?.continue) break;
    cmcontinue = json.continue.cmcontinue;
  }
  categoryCache.set(subject, titles);
  return titles;
}

// `redirects=1` makes MediaWiki resolve redirects server-side: the
// response's `parse.title` is the target page's title and `parse.text`
// is the target's content. Saves us a round trip and avoids brittle
// HTML scraping of the redirect notice.
async function fetchParsed(page) {
  const params = `action=parse&page=${page}&redirects=1&format=json&origin=*`;
  const response = await fetch(`${AOPS_API}?${params}`);
  return response.json();
}

// Fetches a problem page from the AoPS wiki. `redirects=1` on the
// underlying API call follows redirects server-side, so the returned
// `finalPage` already reflects the resolved title.
export async function fetchProblemPage(pagename) {
  if (await isTournamentProblem(pagename)) return fetchTournamentProblem(pagename);
  if (await isArchiveProblem(pagename)) return fetchArchiveProblem(pagename);
  const json = await fetchParsed(pagename);
  if (!json?.parse) return null;

  const html = latexer(json.parse.text["*"]);
  return {
    problem: rewriteWikiLinks(getProblem(html)),
    solutions: rewriteWikiLinks(getSolutions(html)),
    finalPage: json.parse.title ?? pagename,
  };
}

// Fetches a batch of problem pages in parallel. Returns one entry per
// title with `{ title, problem, solutions, difficulty }`, skipping pages
// that have no problem/solutions content (e.g. unresolved redirects or
// 404s).
export async function fetchProblemBatch(titles, { onProgress } = {}) {
  const results = new Array(titles.length).fill(null);
  let done = 0;
  await Promise.all(
    titles.map(async (title, i) => {
      const fetched = await fetchProblemPage(title);
      if (fetched && fetched.problem && fetched.solutions) {
        // Keep the title that was asked for, even when it redirects to a
        // shared problem ("2014 AMC 12A Problems/Problem 9" is the 10A #10
        // page), so a Past Test lists its own problem numbers; answers and
        // difficulty follow the same title. Sets.jsx passes underscored
        // titles, but problemDifficulty needs the space form.
        const canonical = title.replace(/_/g, " ");
        results[i] = {
          title: canonical,
          problem: fetched.problem,
          solutions: fetched.solutions,
          difficulty: problemDifficulty(canonical),
        };
      }
      done += 1;
      onProgress?.(done, titles.length);
    }),
  );
  return results.filter(Boolean);
}

// Fetches a non-problem wiki article (e.g. a theorem or category page).
// The wiki resolves redirects server-side (see fetchParsed); we then
// strip the TOC and AoPS printable-version chrome and return the body
// HTML or null if the page doesn't exist.
export async function fetchArticlePage(pagename) {
  const json = await fetchParsed(pagename);
  if (!json?.parse) return null;

  const html = latexer(json.parse.text["*"]);
  const finalPage = json.parse.title ?? pagename;

  const root = document.createElement("div");
  root.innerHTML = html;
  // Descend into the MediaWiki .mw-parser-output wrapper if present so
  // we iterate real content top-level nodes (matches the legacy
  // $($.parseHTML(html)).children() behavior).
  const container = root.querySelector(".mw-parser-output") ?? root;
  const body = Array.from(container.children)
    .filter((el) => {
      if (el.classList.contains("toc")) return false;
      if (
        el.tagName === "TABLE" &&
        el.textContent.includes("Printable version")
      )
        return false;
      if (
        el.tagName === "PRE" &&
        el.textContent.includes("<geogebra>")
      )
        return false;
      return true;
    })
    .map((el) => el.outerHTML)
    .join("");

  return { html: rewriteWikiLinks(body), finalPage };
}

export async function fetchAnswer(pagename) {
  if (await isTournamentProblem(pagename)) return fetchTournamentAnswer(pagename);
  if (await isArchiveProblem(pagename)) return fetchArchiveAnswer(pagename);
  const answersTitle = `${pagename.split(" Problems/Problem")[0]} Answer Key`;
  const json = await fetchParsed(answersTitle);
  const answerText = json.parse?.text["*"];
  if (!answerText) return null;

  const problemNum = Number(pagename.match(/\d+$/)[0]);
  const tmp = document.createElement("div");
  tmp.innerHTML = answerText;
  const items = tmp.querySelectorAll("ol li");
  return items[problemNum - 1]?.textContent ?? null;
}
