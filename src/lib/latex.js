/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import katex from "katex";

export const formatLatex = (string) =>
  string
    .replace(/&#160;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/^\$|\$$|\\\[|\\\]|\\\(|\\\)/g, "")
    .replace(/&lt;/g, "\\lt ")
    .replace(/&gt;/g, "\\gt ")
    .replace(/\$/g, "\\$$")
    .replace(/align\*/g, "aligned")
    .replace(/eqnarray\*/g, "aligned")
    .replace(/{tabular}(\[\w\])*/g, "{array}")
    .replace(/\\bold{/g, "\\mathbf{")
    .replace(/\\congruent/g, "\\cong")
    .replace(/\\overarc/g, "\\overgroup")
    .replace(/\\overparen/g, "\\overgroup")
    .replace(/\\underarc/g, "\\undergroup")
    .replace(/\\underparen/g, "\\undergroup")
    .replace(/\\mathdollar/g, "\\$")
    .replace(/\\textdollar/g, "\\$");

export function latexer(html) {
  let out = html.replace(
    /<pre>\s+?(.*?)<\/pre>/gs,
    "<p style='white-space: pre-line;'>$1</p>",
  );

  let images = out.match(/<img (?:.*?) class="latex\w*?" (?:.*?)>/g);
  if (!images) return out;
  images = [...new Set(images)];

  for (const image of images) {
    if (image.includes("[asy]")) continue;
    const isDisplay = /alt="\\\[|\\begin/.test(image);
    const imageLatex = formatLatex(image.match(/alt="(.*?)"/)[1]);
    const renderedLatex = katex.renderToString(imageLatex, {
      throwOnError: false,
      displayMode: isDisplay,
    });
    out = out.replaceAll(
      image,
      `<span class="fallback-container">$&</span>` +
        `<katex class="katex-container">${renderedLatex}</katex>`,
    );
  }

  // Some problems (e.g. 2017 AMC 10A #15 Solution 4) embed inline math
  // as raw "\( ... \)" text instead of <img class="latex" ...>, so render
  // those through KaTeX as well.
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, latex) => {
    const rendered = katex.renderToString(formatLatex(latex), {
      throwOnError: false,
      displayMode: false,
    });
    return `<katex class="katex-container">${rendered}</katex>`;
  });

  return out;
}
