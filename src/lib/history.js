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
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
  // Dedupe by title, keeping the most recent entry (which is at the
  // front since callers `unshift`).
  const deduped = [...new Map(items.map((i) => [i.title, i])).values()];
  localStorage.setItem(KEY, JSON.stringify(deduped));
}

export function readHistory() {
  return load() ?? [];
}

export function clearHistory() {
  localStorage.removeItem(KEY);
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
  const url =
    `?problems=${underscores(problemTitles.join("|"))}` +
    (testYear ? `&testyear=${testYear}&testname=${testName}` : "");
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
