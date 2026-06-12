/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const HEADER = /^H[1-6]$/;

// Parse the AoPS wiki API response and return the container whose
// children are the actual content top-level nodes. MediaWiki responses
// wrap the body in `<div class="mw-parser-output">`; we descend into
// that so `.children` matches what jQuery's
// `$($.parseHTML(html)).children()` produced in the legacy code.
function parseContainer(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString;
  const mw = div.querySelector(".mw-parser-output");
  return mw ?? div;
}

function isHeader(el) {
  return HEADER.test(el.tagName);
}

function isPWithSingleBr(el) {
  if (el.tagName !== "P") return false;
  if (el.children.length !== 1) return false;
  return el.firstElementChild.tagName === "BR";
}

// Mirrors the legacy `getProblem`: from the wiki-content wrapper, pick
// the first top-level child that's not a `.toc` or a leading `<dl>`,
// walk DOM siblings until we hit a non-"Problem" header, then strip
// `.toc`, headers, and `<p>` containing only a `<br>`.
export function getProblem(htmlString) {
  const container = parseContainer(htmlString);
  const top = Array.from(container.children);
  // `dl:first-child` in the legacy `.not("dl:first-child")` matches a
  // <dl> that is its parent's first child — only triggers when the very
  // first element is a <dl>.
  const filtered = top.filter(
    (el, i) =>
      !el.classList.contains("toc") && !(i === 0 && el.tagName === "DL"),
  );
  const first = filtered[0];
  if (!first) return "";

  const range = [first];
  for (let cur = first.nextElementSibling; cur; cur = cur.nextElementSibling) {
    if (isHeader(cur) && !cur.textContent.includes("Problem")) break;
    range.push(cur);
  }

  return range
    .filter(
      (el) =>
        !el.classList.contains("toc") &&
        !isHeader(el) &&
        !isPWithSingleBr(el),
    )
    .map((el) => el.outerHTML)
    .join("");
}

// The legacy `.addBack(...)` filter only re-added solution-style
// headers that had "Solution" with surrounding whitespace (so
// "Solution 1", "Quick Solution") or that contained "Diagram" —
// deliberately dropping plain "Solution" / "Solutions" section
// headers. We do the same so the rendered solutions list doesn't get
// an extra "Solutions" heading prepended.
function isKeptSolutionHeader(text) {
  if (text.includes("Diagram")) return true;
  return text.includes(" Solution") || text.includes("Solution ");
}

// Mirrors the legacy `getSolutions`: for each top-level header that
// mentions "Solution" or "Diagram", collect its siblings (until the
// next "See"-header or `<table>`), then add back only the specific
// solution sub-headers, all deduplicated in document order. The
// copyright paragraph the wiki appends to problem pages is stripped.
export function getSolutions(htmlString) {
  const container = parseContainer(htmlString);
  const top = Array.from(container.children);
  const result = [];
  const seen = new Set();
  const add = (el) => {
    if (seen.has(el)) return;
    seen.add(el);
    result.push(el);
  };

  for (const child of top) {
    if (!isHeader(child)) continue;
    const text = child.textContent;
    if (!text.includes("Solution") && !text.includes("Diagram")) continue;

    // Walk siblings until the next "See …" header or a <table>. The
    // header itself is only included if it survives the legacy
    // `addBack` filter (so plain "Solutions" / "Solution" headers
    // don't leak in), but intermediate siblings are kept verbatim
    // since the legacy `nextUntil` did the same.
    if (isKeptSolutionHeader(text)) add(child);
    for (let cur = child.nextElementSibling; cur; cur = cur.nextElementSibling) {
      if (isHeader(cur) && cur.textContent.includes("See")) break;
      if (cur.tagName === "TABLE") break;
      add(cur);
    }
  }

  return result
    .filter(
      (el) =>
        !(
          el.tagName === "P" &&
          el.textContent.includes(
            "The problems on this page are copyrighted by the",
          )
        ),
    )
    .map((el) => el.outerHTML)
    .join("");
}
