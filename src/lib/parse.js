/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const HEADER = /^H[1-6]$/;

function parseContainer(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString;
  return div;
}

function isHeader(el) {
  return HEADER.test(el.tagName);
}

function isPWithSingleBr(el) {
  if (el.tagName !== "P") return false;
  if (el.children.length !== 1) return false;
  return el.firstElementChild.tagName === "BR";
}

// Mirrors the legacy `getProblem`: pick the first top-level child that
// is not a `.toc` or a leading `<dl>`, walk DOM siblings until we hit a
// non-"Problem" header, then strip headers/toc/empty p>br.
export function getProblem(htmlString) {
  const container = parseContainer(htmlString);
  const top = Array.from(container.children);
  const filtered = top.filter(
    (el, i) => !el.classList.contains("toc") && !(i === 0 && el.tagName === "DL"),
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

// Mirrors the legacy `getSolutions`: for each top-level header that
// mentions "Solution" or "Diagram", collect the header and its siblings
// until the next "See"-header or `<table>`, deduplicated in document
// order, with the copyright paragraph stripped.
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
    add(child);
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
