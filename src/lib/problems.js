/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const validProblem = (problem) =>
  problem.includes("Problems/Problem") &&
  /^\d{4}/.test(problem) &&
  /\d+$/.test(problem);

export const computeTest = (problem) =>
  problem
    .match(/(\d{4} )(.*)( Problems)/)[2]
    .replace(/AMC ((?:10)|(?:12))[AB]/, "AMC $1")
    .replace(/AIME I+/, "AIME")
    .replace(/AJHSME/, "AMC 8");

export const computeYear = (problem) => problem.match(/^\d{4}/)[0];
export const computeNumber = (problem) => problem.match(/\d+$/)[0];

export function computeDifficulty(test, num, year) {
  let diff;
  switch (test) {
    case "AMC 8":
      diff = num < 4 ? 0.25
        : num < 7 ? 0.5
        : num < 10 ? 0.75
        : num < 13 ? 1
        : num < 17 ? 1.25
        : num < 21 ? 1.5
        : num < 24 ? 1.75
        : 2;
      break;
    case "AMC 10":
      diff = num < 4 ? 1
        : num < 7 ? 1.5
        : num < 10 ? 1.75
        : num < 13 ? 2
        : num < 15 ? 2.25
        : num < 17 ? 2.5
        : num < 19 ? 2.75
        : num < 21 ? 3
        : num < 23 ? 3.5
        : num < 25 ? 4
        : 4.5;
      break;
    case "AMC 12":
      diff = num < 4 ? 1.25
        : num < 6 ? 1.5
        : num < 9 ? 1.75
        : num < 11 ? 2
        : num < 14 ? 2.5
        : num < 17 ? 3
        : num < 19 ? 3.25
        : num < 21 ? 3.5
        : num < 23 ? 4
        : num < 24 ? 4.5
        : num < 25 ? 5
        : 5.5;
      break;
    case "AHSME":
      diff = num < 4 ? 1
        : num < 7 ? 1.5
        : num < 10 ? 1.75
        : num < 13 ? 2
        : num < 15 ? 2.25
        : num < 17 ? 2.5
        : num < 19 ? 2.75
        : num < 21 ? 3
        : num < 23 ? 3.5
        : num < 25 ? 4
        : num < 27 ? 4.5
        : num < 29 ? 5
        : 5.5;
      break;
    case "AIME":
      diff = num < 3 ? 3
        : num < 6 ? 3.5
        : num < 8 ? 4
        : num < 10 ? 4.5
        : num < 11 ? 5
        : num < 13 ? 5.5
        : num < 14 ? 6
        : 6.5;
      break;
    case "USAJMO":
      diff = num == 1 || num == 4 ? 5.5 : num == 2 || num == 5 ? 6 : 7;
      break;
    case "USAMO":
      diff = num == 1 || num == 4 ? 6.5 : num == 2 || num == 5 ? 7.5 : 8.5;
      break;
    case "IMO":
      diff = num == 1 || num == 4 ? 6.5 : num == 2 || num == 5 ? 7.5 : 9.5;
      break;
    default:
      diff = -1;
      break;
  }
  return diff;
}

export function matchesOptions(problem, tests, yearsFrom, yearsTo, diffFrom, diffTo) {
  if (!/^\d{4}.*Problems\/Problem \d+$/.test(problem)) return false;

  const problemTest = computeTest(problem);

  let effectiveTests = tests;
  if (tests.includes("(AMC Tests)")) {
    effectiveTests = [...tests];
    effectiveTests.splice(
      effectiveTests.indexOf("(AMC Tests)"),
      1,
      "AHSME",
      "AMC 8",
      "AMC 10",
      "AMC 12",
      "AIME",
      "USAMO",
      "IMO",
    );
  }
  if (!effectiveTests.includes("(All Tests)") && !effectiveTests.includes(problemTest))
    return false;

  const problemYear = computeYear(problem);
  if (problemYear < yearsFrom || yearsTo < problemYear) return false;

  const problemNumber = computeNumber(problem);
  const problemDiff = computeDifficulty(problemTest, problemNumber, problemYear);
  if (problemDiff < diffFrom || diffTo < problemDiff) return false;

  return true;
}

export const sortProblems = (problems) =>
  problems.sort(
    (a, b) =>
      Math.sign(computeYear(a) - computeYear(b)) ||
      computeTest(a).localeCompare(computeTest(b)) ||
      Math.sign(computeNumber(a) - computeNumber(b)),
  );

export const titleCleanup = (string) =>
  decodeURIComponent(string)
    .replace(/_/g, " ")
    .replace("Problems/Problem ", "#")
    .replace(/'/g, "’");

export const underscores = (string) =>
  string.replace(/ /g, "_").replace(/%2F/g, "/");

// Builds the qualified test name used in problem page titles
// (e.g. "AMC 10A", "AIME I", "Fall AMC 10A") given a base test and an
// optional version selector.
export function fullTestName(test, version) {
  if (!version) return test;
  const parts = version.split(" ");
  if (parts.length > 1) return `${parts[0]} ${test}${parts[1]}`;
  if (version === "I" || version === "II") return `${test} ${version}`;
  return `${test}${version}`;
}

export const sanitize = (string) =>
  string
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Strips wiki / KaTeX chrome from rendered problem HTML so the result
// reads as plain text. Used to derive short history snippets.
export const sourceCleanup = (string) =>
  string
    .replace(
      /<span class="fallback-container">.*?<\/span><katex class="katex-container">.*?<annotation encoding="application\/x-tex">(.*?)<\/annotation>.*?<\/katex>/gs,
      "$$$1$$",
    )
    .replace(
      /<span class="mw-headline" id="Problem">Problem<\/span><span class="mw-editsection"><span class="mw-editsection-bracket">\[<\/span><a href=".*?" title="Edit section: Problem">edit<\/a><span class="mw-editsection-bracket">\]<\/span><\/span><\/h2>/g,
      "",
    )
    .replace(/<span class="mw-headline" id=".*?">(.*?)<\/span>/g, "$1")
    .replace(/<span class="mw-editsection">.*?<\/span><\/span>/g, "")
    .replace(/<a.*?>/g, "")
    .replace(/<\/a>/g, "")
    .replace(/<br.*?>/g, "")
    .replace(/<dl>.*?<\/dl>/g, "")
    .replace(/<img.*?>/g, "")
    .replace(/<p>/g, "")
    .replace(/<\/p>/g, "");
