/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { sanitize, sourceCleanup, titleCleanup, underscores } from "./problems.js";

const KEY = "pageHistory";
const MAX_ITEMS = 50;
const SNIPPET_LEN = 140;
const BATCH_TITLE_LEN = 40;

function snippetFromHtml(html) {
  if (!html) return "";
  return sanitize(sourceCleanup(html).substring(0, SNIPPET_LEN));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? null;
  } catch {
    return null;
  }
}

function persist(items) {
  // Dedupe by URL, keeping the most recent entry (which is at the front
  // since callers `unshift`). Titles can repeat: every random set made on
  // the same day is "Random Set - <date>".
  const seen = new Set();
  const deduped = items.filter((i) => !seen.has(i.url) && seen.add(i.url));
  try {
    localStorage.setItem(KEY, JSON.stringify(deduped.slice(0, MAX_ITEMS)));
  } catch {
    // Storage is full or blocked; history just isn't saved.
  }
}

export function readHistory() {
  return load() ?? [];
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage is blocked; nothing was saved.
  }
}

export function removeHistory(url) {
  persist(readHistory().filter((i) => i.url !== url));
}

// URL of a problem set: its problems, the test for Past Tests (needed for
// the AMC score cutoffs) and its title, so reopening it from History or a
// shared link looks the same.
export function batchUrl(problemTitles, { title, testYear, testName } = {}) {
  return (
    `?problems=${underscores(problemTitles.join("|"))}` +
    (testYear && testName
      ? `&testyear=${encodeURIComponent(testYear)}&testname=${encodeURIComponent(testName)}`
      : "") +
    (title ? `&title=${encodeURIComponent(title)}` : "")
  );
}

// Records a single-problem or article view.
export function addHistory(pagename, problemHtml) {
  const item = {
    url: `?page=${underscores(pagename)}`,
    title: titleCleanup(pagename),
    snippet: snippetFromHtml(problemHtml),
  };
  const items = load() ?? [];
  items.unshift(item);
  persist(items);
}

// Records a multi-problem batch view.
export function addHistoryBatch(
  problemTitles,
  firstProblemHtml,
  customTitle,
  testYear,
  testName,
) {
  const url = batchUrl(problemTitles, {
    title: customTitle,
    testYear,
    testName,
  });
  const fallbackTitle =
    problemTitles
      .map((t) => titleCleanup(t))
      .join(", ")
      .substring(0, BATCH_TITLE_LEN) + "...";
  const item = {
    url,
    title: customTitle ? sanitize(customTitle) : fallbackTitle,
    snippet: snippetFromHtml(firstProblemHtml),
  };
  const items = load() ?? [];
  items.unshift(item);
  persist(items);
}
