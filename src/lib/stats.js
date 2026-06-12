/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const COUNTERS = [
  "numProblems",
  "numAnswered",
  "numCorrect",
  "numRetry",
  "numStreak",
  "numToday",
  "numSets",
  "numArticles",
];

function read(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readStats() {
  const out = {};
  for (const k of COUNTERS) out[k] = read(k);
  out.numWrong = Math.max(0, out.numAnswered - out.numCorrect - out.numRetry);
  return out;
}

export function increment(key, by = 1) {
  if (!COUNTERS.includes(key)) return;
  write(key, read(key) + by);
}

// `numStreak` stores the lifetime longest streak. Caller passes the
// current session-streak length; we keep the larger of the two.
export function bumpStreakIfLonger(currentStreak) {
  if (currentStreak > read("numStreak")) write("numStreak", currentStreak);
}

export function clearStats() {
  for (const k of COUNTERS) write(k, 0);
}

// Resets the "today" counter if the local date has changed since the
// last time we touched it.
export function rollTodayIfNeeded() {
  const today = new Date().toDateString();
  if (localStorage.getItem("dateToday") !== today) {
    localStorage.setItem("dateToday", today);
    write("numToday", 0);
  }
}
