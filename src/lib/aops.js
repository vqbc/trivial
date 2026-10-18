/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AOPS_API, DEFAULT_TESTS } from "./constants.js";
import { latexer } from "./latex.js";
import { rewriteWikiLinks } from "./links.js";
import { getProblem, getSolutions } from "./parse.js";
import { normalizeTitle, wikiPath } from "./wikiKey.js";
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

const BASE = import.meta.env.BASE_URL;

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
      fetch(`${BASE}data/allproblems.json`).then((r) => r.json()),
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
    pagesPromise = fetch(`${BASE}data/allpages.json`).then((r) => r.json());
  }
  pagesCache = await pagesPromise;
  return pagesCache;
}

// Returns the set of problem titles matching the given options. When
// `subjects` is empty or contains "(All Subjects)", the universe is the
// preloaded problem list (see fetchAllProblems). Otherwise it's the union
// of each subject's bundled AoPS and tournament category pages.
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

// Wiki-hosted images are blocked cross-origin too: dev proxies them, and
// snapshot pages use the snapshot's copies.
const WIKI_IMAGES = /(?:https?:)?\/\/artofproblemsolving\.com\/wiki\/images\//g;
const withImages = (json, base) => {
  const text = json?.parse?.text;
  if (text) text["*"] = text["*"].replace(WIKI_IMAGES, base);
  return json;
};

// Every AoPS API call goes through here. AoPS blocks cross-origin calls, so
// dev talks to the live wiki through the Chrome-backed proxy (aops-chrome.js)
// and production builds read the static snapshot from scripts/snapshot.js,
// falling back to the live API for anything the snapshot doesn't have.
// Resolves to null instead of rejecting, so an unreachable wiki shows an
// error instead of hanging.
export function aopsApi(params) {
  const live = () => fetch(`${AOPS_API}?${params}`).then((r) => r.json());
  const req = import.meta.env.DEV
    ? fetch(`/aops-api?${params}`)
        .then((r) => r.json())
        .then((json) => withImages(json, "/aops-images/"))
    : snapshotApi(new URLSearchParams(params)).then((json) => json ?? live());
  return req.catch(() => null);
}

// Missing or unreadable (e.g. a host's index.html fallback) means "not in
// the snapshot".
const readSnapshot = (file) =>
  fetch(`${BASE}data/${file}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
let categoriesPromise = null;
let redirectsPromise = null;

// Answers the few api.php queries the app makes from snapshot files, or
// null when the snapshot doesn't have the answer.
async function snapshotApi(p) {
  if (p.get("action") === "parse") {
    let page = await readSnapshot(`wiki/${wikiPath(p.get("page"))}`);
    if (page?.redirect) {
      page = await readSnapshot(`wiki/${wikiPath(page.redirect)}`);
    }
    if (!page) return null;
    const json = { parse: { title: page.title, text: { "*": page.text } } };
    return withImages(json, `${BASE}data/images/`);
  }
  if (p.get("list") === "categorymembers") {
    categoriesPromise ??= readSnapshot("categories.json");
    const category = p.get("cmtitle").replace(/^Category:/, "");
    const titles = (await categoriesPromise)?.[category];
    if (!titles) return null;
    return { query: { categorymembers: titles.map((title) => ({ title })) } };
  }
  if (p.get("list") === "search") {
    // No full-text index offline: match every search word against titles.
    // Redirects get the "#REDIRECT" snippet the live API returns, which
    // Search already filters out. Without a snapshot, use the live search.
    redirectsPromise ??= readSnapshot("redirects.json").then((r) => r && new Set(r));
    const redirects = await redirectsPromise;
    if (!redirects) return null;
    const words = normalizeTitle(p.get("srsearch")).toLowerCase().split(" ");
    const pages = await fetchAllPages();
    const hits = pages.filter((t) => words.every((w) => t.toLowerCase().includes(w)));
    const snippet = (title) => (redirects.has(title) ? "#REDIRECT" : "");
    return { query: { search: hits.map((title) => ({ title, snippet: snippet(title) })) } };
  }
  return null;
}

// `redirects=1` makes MediaWiki resolve redirects server-side: the
// response's `parse.title` is the target page's title and `parse.text`
// is the target's content. Saves us a round trip and avoids brittle
// HTML scraping of the redirect notice.
async function fetchParsed(page) {
  const params = `action=parse&page=${page}&redirects=1&format=json&origin=*`;
  return aopsApi(params);
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
        // Sets.jsx passes underscored titles, but problemDifficulty's
        // regexes need the space-form ("2024 AMC 10A Problems/Problem 1").
        // The wiki returns the resolved title with spaces; fall back
        // to normalizing the input ourselves if that's missing.
        const canonical =
          fetched.finalPage ?? title.replace(/_/g, " ");
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
