/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AOPS_API, DEFAULT_TESTS } from "./constants.js";
import { latexer } from "./latex.js";
import { getProblem, getSolutions } from "./parse.js";
import {
  computeDifficulty,
  computeNumber,
  computeTest,
  computeYear,
  matchesOptions,
  validProblem,
} from "./problems.js";

let problemsCache = null;
let problemsPromise = null;

export async function fetchAllProblems() {
  if (problemsCache) return problemsCache;
  if (!problemsPromise) {
    problemsPromise = fetch("/data/allproblems.json").then((r) => r.json());
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
  // Empty test list defaults to "(AMC Tests)" so users who haven't
  // touched the filter still get something useful.
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
    const titles = await fetchCategoryPages(subject);
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

async function fetchParsed(page) {
  const params = `action=parse&page=${page}&format=json&origin=*`;
  const response = await fetch(`${AOPS_API}?${params}`);
  return response.json();
}

// Looks for a MediaWiki redirect marker (.redirectMsg / .redirectText)
// in the response HTML and returns the decoded target page name, or
// null if the page isn't a redirect. Handles both /wiki/Target and
// /wiki/index.php/Target href styles.
function extractRedirectTarget(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const anchor =
    tmp.querySelector(".redirectMsg a") ??
    tmp.querySelector(".redirectText a");
  if (!anchor) return null;
  const href = anchor.getAttribute("href") ?? "";
  const match = href.match(/\/wiki\/(?:index\.php\/)?(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]).replace(/_/g, " ");
}

// Fetches a problem page from the AoPS wiki, following the redirect once
// if needed. Returns null if the page doesn't exist.
export async function fetchProblemPage(pagename) {
  let json = await fetchParsed(pagename);
  if (!json?.parse) return null;

  let html = latexer(json.parse.text["*"]);
  let problem = getProblem(html);
  let solutions = getSolutions(html);
  let finalPage = pagename;

  const hasContent = problem && solutions;
  if (!hasContent) {
    const target = extractRedirectTarget(html);
    if (target) {
      json = await fetchParsed(target);
      if (json?.parse) {
        html = latexer(json.parse.text["*"]);
        problem = getProblem(html);
        solutions = getSolutions(html);
        finalPage = target;
      }
    }
  }

  return { problem, solutions, finalPage };
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
        results[i] = {
          title: fetched.finalPage ?? title,
          problem: fetched.problem,
          solutions: fetched.solutions,
          difficulty: computeDifficulty(
            computeTest(title),
            computeNumber(title),
            computeYear(title),
          ),
        };
      }
      done += 1;
      onProgress?.(done, titles.length);
    }),
  );
  return results.filter(Boolean);
}

// Fetches a non-problem wiki article (e.g. a theorem or category page).
// Follows the redirect once, strips the TOC and AoPS printable-version
// chrome, and returns the body HTML or null if the page doesn't exist.
export async function fetchArticlePage(pagename) {
  let json = await fetchParsed(pagename);
  if (!json?.parse) return null;

  let html = latexer(json.parse.text["*"]);
  let finalPage = pagename;

  const target = extractRedirectTarget(html);
  if (target) {
    json = await fetchParsed(target);
    if (json?.parse) {
      html = latexer(json.parse.text["*"]);
      finalPage = target;
    }
  }

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

  return { html: body, finalPage };
}

export async function fetchAnswer(pagename) {
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
