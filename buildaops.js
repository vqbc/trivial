/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from "fs";
import path from "path";
import { texToHtml } from "./buildtournaments.js";

// Builds public/data/aops/ from the AmcTrivialProblems archive's aops/
// folder: the AMC 8/10/12, AIME, USAJMO, USAMO, IMO, AHSME and AJHSME
// problems taken from the AoPS wiki (see the archive's AOPS.md), so the
// site no longer needs the wiki API for them. Run with Node and commit
// the output, like buildtournaments.js:
//
//   node buildaops.js [path/to/AmcTrivialProblems/aops]
//
// Output, all read by src/lib/aopsarchive.js:
//   index.json                  { "2022 AMC 10A": [1, 2, ..., 25], ... }
//                               — the problem numbers of each test
//   categories.json             { "Introductory Algebra Problems": [titles],
//                               ... } — the wiki's subject categories
//   2022_AMC_10A.json           one file per test with the problem and
//                               solution HTML and the answer key entry
//   2022_AMC_10A/3-fig1.png     figures, named <problem>-<figure>
//
// The HTML is laid out like the wiki pages the site used to fetch
// (lib/parse.js): solution sections get <h2> headings and signatures
// read "~user". Math stays as \( ... \) / \[ ... \] for KaTeX.

const archive = process.argv[2] ?? "../AmcTrivialProblems/aops";
const outDir = "public/data/aops";

// The wiki's {{solution}} template, shown on pages with no solution.
const NO_SOLUTION =
  "<p><i>This problem needs a solution. If you have a solution for it, " +
  "please help us out by adding it.</i></p>";

const underscores = (s) => s.replace(/ /g, "_");

function pngWidth(file) {
  const buf = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  return buf.readUInt32BE(16);
}

function readTex(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
}

// Index just past the {...} group starting at s[i] === "{", or -1.
function groupEnd(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") j++;
    else if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return j + 1;
  }
  return -1;
}

// aops_convert.py starts every wiki section with a paragraph holding
// only "\textbf{<heading>.}" (the "." is added unless the heading ends
// in "?" or "!"). Returns the heading, or null for other paragraphs.
function sectionHeading(para) {
  const p = para.trim();
  if (!p.startsWith("\\textbf{") || groupEnd(p, 7) !== p.length) return null;
  const inner = p.slice(8, -1).trim();
  if (!/[.?!]$/.test(inner)) return null;
  return inner.replace(/\.$/, "");
}

function splitSections(tex) {
  const sections = [];
  for (const para of tex.split(/\n[ \t]*\n/)) {
    const heading = sectionHeading(para);
    if (heading !== null || !sections.length) sections.push({ heading, body: [] });
    if (heading === null) sections.at(-1).body.push(para);
  }
  return sections.map((s) => ({ heading: s.heading, body: s.body.join("\n\n") }));
}

// Like lib/parse.js's getSolutions on a wiki page: sections before the
// first one about a solution or diagram are skipped, and that first
// heading is hidden when it's a plain "Solution"/"Solutions".
const isSolution = (h) => h !== null && (h.includes("Solution") || h.includes("Diagram"));
const keepsHeading = (h) =>
  h.includes("Diagram") || h.includes(" Solution") || h.includes("Solution ");

function solutionsHtml(tex, image, where) {
  let sections = splitSections(tex);
  const first = sections.findIndex((s) => isSolution(s.heading));
  if (first >= 0) sections = sections.slice(first);
  return sections
    .map((s, i) => {
      const body = s.body.trim() ? texToHtml(s.body, image, where) : "";
      if (s.heading === null || (i === 0 && first >= 0 && !keepsHeading(s.heading))) {
        return body;
      }
      const heading = texToHtml(s.heading, image, where).replace(/^<p>([\s\S]*)<\/p>$/, "$1");
      // (math delimiters left out so renderMath doesn't touch the id)
      const id = underscores(
        heading.replace(/<[^>]*>|\\[()[\]]/g, "").replace(/["\\]/g, "").trim(),
      );
      return `<h2><span class="mw-headline" id="${id}">${heading}</span></h2>${body}`;
    })
    .join("");
}

// Signature lines come out of aops_convert.py as \emph{--- user}; the
// wiki shows them as "~user".
const signatures = (tex) => tex.replace(/^\\emph\{--- (.*)\}$/gm, "\\textasciitilde $1");

function build() {
  const rows = JSON.parse(fs.readFileSync(path.join(archive, "index.json"), "utf8"));

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  // Pass 1: titles, so redirects can point at the page they land on.
  const problems = rows.map((row) => {
    const dir = path.join(archive, "..", row.path);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
    const title = meta.source.aops_title;
    return { row, dir, meta, title, test: title.split(" Problems/Problem")[0] };
  });
  const titles = new Set(problems.map((p) => p.title));

  const tests = new Map(); // test -> { year, problems }
  const categories = {};
  let figureCount = 0;
  let failed = 0;

  for (const { row, dir, meta, title, test } of problems) {
    const n = meta.number;
    const where = row.path;
    if (!tests.has(test)) tests.set(test, { test, year: meta.year, problems: {} });

    // Answer key entry in the form the site compares against: the
    // letter, or the AIME answer padded to three digits.
    let answer = meta.answer ?? null;
    if (answer !== null && meta.contest === "aime") answer = String(answer).padStart(3, "0");

    // Shared AMC 10/12 problems redirect to one wiki page; like the
    // wiki, the redirect shows that page (and its title).
    const resolved = meta.source.resolved_title;
    if (resolved && resolved !== title && titles.has(resolved)) {
      tests.get(test).problems[n] = { page: resolved, answer };
      continue;
    }

    // Subject categories of the page itself (the wiki lists only
    // canonical pages in a category, not redirects).
    const raw = JSON.parse(fs.readFileSync(path.join(archive, "..", meta.source.raw), "utf8"));
    for (const c of raw.categories ?? []) {
      const name = (c["*"] ?? c).replace(/_/g, " ");
      (categories[name] ??= []).push(title);
    }

    const image = (file) => {
      const src = path.join(dir, file);
      if (!fs.existsSync(src)) return "";
      const target = path.join(outDir, underscores(test), `${n}-${file}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(src, target);
      figureCount++;
      // AoPS renders figures at screen size, so they show as on the wiki.
      const url = `/data/aops/${underscores(test)}/${n}-${file}`;
      return `<img class="latexcenter" src="${url}" width="${pngWidth(src)}" alt="">`;
    };

    let problem;
    let solutions;
    try {
      problem = texToHtml(signatures(readTex(path.join(dir, "problem.tex"))), image, where);
      const solutionTex = readTex(path.join(dir, "solution.tex"));
      solutions = solutionTex ? solutionsHtml(signatures(solutionTex), image, where) : "";
    } catch (err) {
      console.warn(`${where}: ${err.message}`);
      failed++;
      continue;
    }
    tests.get(test).problems[n] = { problem, solutions: solutions || NO_SOLUTION, answer };
  }

  const index = {};
  for (const [test, data] of tests) {
    index[test] = Object.keys(data.problems).map(Number);
    fs.writeFileSync(
      path.join(outDir, `${underscores(test)}.json`),
      JSON.stringify(data, undefined, 2),
    );
  }
  const sortedIndex = Object.entries(index).sort(([a], [b]) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  // One test per line keeps the file small and diffs readable.
  fs.writeFileSync(
    path.join(outDir, "index.json"),
    `{\n${sortedIndex.map(([t, ns]) => `  ${JSON.stringify(t)}: ${JSON.stringify(ns)}`).join(",\n")}\n}\n`,
  );
  fs.writeFileSync(
    path.join(outDir, "categories.json"),
    JSON.stringify(Object.fromEntries(Object.entries(categories).sort()), undefined, 1),
  );

  const count = sortedIndex.reduce((sum, [, ns]) => sum + ns.length, 0);
  console.log(
    `Wrote ${sortedIndex.length} tests, ${count} problems, ${figureCount} figures to ${outDir}/` +
      (failed ? ` (${failed} problems failed to convert).` : "."),
  );
}

build();
