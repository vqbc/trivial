/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TOURNAMENTS } from "./src/lib/constants.js";

// Builds public/data/tournaments/ from the AmcTrivialProblems archive
// (one directory per problem holding
// problem.tex / answer.tex / solution.tex / meta.json / figN.png, plus
// problems/index.json and problems/rounds.json). Run with Node and
// commit the output, like downloadlists.js:
//
//   node buildtournaments.js [path/to/AmcTrivialProblems/problems]
//
// Output, all read by src/lib/tournaments.js:
//   index.json                  { "2018 BMT Algebra": { "1": [2, "algebra"],
//                               ... }, ... } — difficulty and subject of
//                               each problem by test (problems the
//                               archive marks "excluded" are left out)
//   2018_BMT_Algebra.json       one file per test with the problem and
//                               solution HTML and the official answer
//   2018_BMT_Algebra/3-fig1.png figures, named <problem>-<figure>
//
// The HTML keeps math as \( ... \) / \[ ... \] so the site can render
// it with KaTeX at view time, the same way lib/latex.js handles AoPS
// pages; everything else (paragraphs, lists, emphasis, figures) is
// converted here.

const archive = process.argv[2] ?? "../AmcTrivialProblems/problems";
const outDir = "public/data/tournaments";

// Archive codes -> names used in problem titles.
const TOURNAMENT_NAMES = {
  bmt: "BMT",
  "hmmt-feb": "HMMT February",
  "hmmt-nov": "HMMT November",
  pumac: "PUMaC",
  smt: "SMT",
  asmt: "SMT", // SMT 2015–16, hosted by AlphaStar; same tournament
  cmm: "CMM",
  cmimc: "CMIMC",
  cmwmc: "CMWMC",
  dmm: "DMM",
  mmaths: "MMATHS",
  gim: "GiM",
};

const ROUND_NAMES = {
  alg: "Algebra",
  geo: "Geometry",
  comb: "Combinatorics",
  nt: "Number Theory",
  calc: "Calculus",
  disc: "Discrete",
  adv: "Advanced Topics",
  analysis: "Analysis",
  gen: "General",
  gen1: "General 1",
  gen2: "General 2",
  algnt: "Algebra and Number Theory",
  algcalc: "Algebra and Calculus",
  algcomb: "Algebra and Combinatorics",
  alggeo: "Algebra and Geometry",
  calccomb: "Calculus and Combinatorics",
  calcgeo: "Calculus and Geometry",
  combgeo: "Combinatorics and Geometry",
  thm: "Theme",
  indiv: "Individual",
  team: "Team",
  team2: "Team B",
  guts: "Guts",
  relay: "Relay",
  devil: "Devil",
  mixer: "Mixer",
  tournament: "Tournament",
  live: "Live",
  tiebreak: "Tiebreaker",
  "lightning-finals": "Lightning Finals",
};

// Suffixes on round codes: "alg-tiebreak", "geo-a", "comb-d2".
const ROUND_SUFFIXES = {
  "-tiebreak": " Tiebreaker",
  "-a": " A",
  "-b": " B",
  "-d1": " Division 1",
  "-d2": " Division 2",
};

// Order of rounds in the printed TOURNAMENTS listing (see the end).
const ROUND_ORDER = Object.keys(ROUND_NAMES);

function roundName(code) {
  for (const [suffix, name] of Object.entries(ROUND_SUFFIXES)) {
    if (code.endsWith(suffix) && code !== "tiebreak") {
      const base = code.slice(0, -suffix.length);
      if (ROUND_NAMES[base]) return ROUND_NAMES[base] + name;
    }
  }
  if (!ROUND_NAMES[code]) throw new Error(`Unknown round code "${code}"`);
  return ROUND_NAMES[code];
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// --- LaTeX -> HTML ---------------------------------------------------

// Environments whose whole body is math and gets wrapped in \[ ... \].
const MATH_ENVS = new Set([
  "align", "align*", "aligned", "alignat", "alignat*", "gather", "gather*",
  "gathered", "equation", "equation*", "eqnarray", "eqnarray*",
  "displaymath", "multline", "multline*", "cases", "array", "tabular",
  "matrix", "pmatrix", "bmatrix", "vmatrix", "Bmatrix", "Vmatrix",
]);

// Rewrites environments KaTeX only knows under another name. The site's
// formatLatex already does align* -> aligned and tabular -> array; the
// rest is done here so lib/latex.js stays untouched.
function normalizeMath(tex) {
  return tex
    .replace(/\\begin\{(align|eqnarray)\*?\}/g, "\\begin{aligned}")
    .replace(/\\end\{(align|eqnarray)\*?\}/g, "\\end{aligned}")
    .replace(/\\begin\{alignat\*?\}/g, "\\begin{alignedat}")
    .replace(/\\end\{alignat\*?\}/g, "\\end{alignedat}")
    .replace(/\\begin\{(gather|multline)\*?\}/g, "\\begin{gathered}")
    .replace(/\\end\{(gather|multline)\*?\}/g, "\\end{gathered}")
    .replace(/\\(begin|end)\{(equation\*?|displaymath)\}/g, "")
    // formatLatex strips every "\[" it sees, which would mangle the
    // spacing form of a line break; drop the spacing instead.
    .replace(/\\\\\[[^\]]*\]/g, "\\\\")
    // formatLatex escapes every "$" (breaking an already escaped one)
    // and maps \textdollar back to "\$" afterwards.
    .replace(/\\\$/g, "\\textdollar ")
    .trim();
}

function math(tex, display) {
  const body = escapeHtml(normalizeMath(tex));
  return display ? `\\[${body}\\]` : `\\(${body}\\)`;
}

const ACCENTS = {
  "'": "́", "`": "̀", "^": "̂", '"': "̈", "~": "̃",
  "=": "̄", ".": "̇", H: "̋", r: "̊", c: "̧",
  v: "̌", u: "̆", d: "̣", b: "̱",
};

const SIMPLE_COMMANDS = {
  ldots: "…", dots: "…", textellipsis: "…", quad: "&emsp;",
  qquad: "&emsp;&emsp;", hfill: " ", textbackslash: "\\",
  textasciitilde: "~", textasciicircum: "^", LaTeX: "LaTeX", TeX: "TeX",
  newline: "<br>", noindent: "", indent: "", centering: "", medskip: "",
  smallskip: "", bigskip: "", vfill: "", hline: "", relax: "", i: "ı",
  j: "ȷ", ss: "ß", ae: "æ", oe: "œ", o: "ø", aa: "å", AE: "Æ", OE: "Œ",
  O: "Ø", AA: "Å",
};

// Commands taking one argument that just wrap it.
const WRAP_COMMANDS = {
  textbf: ["<b>", "</b>"],
  emph: ["<i>", "</i>"],
  textit: ["<i>", "</i>"],
  textsl: ["<i>", "</i>"],
  texttt: ["<code>", "</code>"],
  underline: ["<u>", "</u>"],
  textsc: ['<span style="font-variant: small-caps">', "</span>"],
  fbox: ['<span style="border: 1px solid; padding: 0 0.2em">', "</span>"],
  footnote: [" (", ")"],
  textrm: ["", ""], textsf: ["", ""], textup: ["", ""], textnormal: ["", ""],
  mbox: ["", ""], text: ["", ""], hbox: ["", ""],
};

// Math-mode commands that occasionally appear in running text, with
// their argument counts.
const MATH_COMMANDS = {
  boxed: 1, frac: 2, dfrac: 2, tfrac: 2, sqrt: 1, binom: 2, pi: 0,
  blacksquare: 0, cdot: 0, times: 0, pm: 0, infty: 0, angle: 0,
  triangle: 0, circ: 0, ell: 0, alpha: 0, beta: 0, theta: 0, le: 0,
  ge: 0, leq: 0, geq: 0, ne: 0, neq: 0,
};

// Commands with one argument that gets dropped.
const DROP_COMMANDS = new Set([
  "vspace", "vspace*", "hspace", "hspace*", "label", "setlength",
  "hyphenation", "pagebreak", "newpage", "linebreak",
]);

const BLOCK = "\u0001"; // separates paragraph chunks

const unknown = new Map(); // command -> count, reported at the end

function warnUnknown(name, where) {
  const key = `\\${name}`;
  unknown.set(key, (unknown.get(key) ?? 0) + 1);
  if (unknown.get(key) === 1) console.warn(`Unknown command ${key} in ${where}`);
}

// Reads a balanced {...} group starting at s[i] === "{"; returns
// [content, indexAfterGroup].
function readGroup(s, i) {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") {
      j++;
      continue;
    }
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) return [s.slice(i + 1, j), j + 1];
    }
  }
  throw new Error(`Unbalanced braces near: ${s.slice(i, i + 60)}`);
}

// Reads an optional [...] argument at s[i]; returns [content|null, index].
function readOptional(s, i) {
  if (s[i] !== "[") return [null, i];
  const end = s.indexOf("]", i);
  if (end < 0) return [null, i];
  return [s.slice(i + 1, end), end + 1];
}

// Finds the matching \end{env} for a \begin{env} whose body starts at
// index i; returns [body, indexAfterEnd].
function readEnvironment(s, env, i) {
  const begin = `\\begin{${env}}`;
  const end = `\\end{${env}}`;
  let depth = 1;
  let j = i;
  while (j < s.length) {
    const nb = s.indexOf(begin, j);
    const ne = s.indexOf(end, j);
    if (ne < 0) throw new Error(`Missing \\end{${env}}`);
    if (nb >= 0 && nb < ne) {
      depth++;
      j = nb + begin.length;
    } else {
      depth--;
      if (depth === 0) return [s.slice(i, ne), ne + end.length];
      j = ne + end.length;
    }
  }
  throw new Error(`Missing \\end{${env}}`);
}

// Splits a list body on top-level \item commands; returns
// [{ label, body }] (label is the optional [..] text).
function splitItems(body) {
  const items = [];
  let depth = 0;
  let braces = 0;
  let current = null;
  let i = 0;
  while (i < body.length) {
    if (body[i] === "\\") {
      if (body.startsWith("\\begin{", i)) depth++;
      else if (body.startsWith("\\end{", i)) depth--;
      else if (
        depth === 0 &&
        braces === 0 &&
        /^\\item(?![a-zA-Z])/.test(body.slice(i, i + 6))
      ) {
        let j = i + 5;
        const [label, after] = readOptional(body, j);
        j = after;
        current = { label, start: j };
        items.push(current);
        i = j;
        continue;
      }
      i += 2;
      continue;
    }
    if (body[i] === "{") braces++;
    else if (body[i] === "}") braces--;
    i++;
  }
  return items.map((item, k) => ({
    label: item.label,
    body: body.slice(item.start, k + 1 < items.length ? findItemStart(body, items[k + 1].start) : body.length),
  }));
}

// Backs up from the start of an item's body to the \item that began it,
// so the previous item's body excludes the command and its label.
function findItemStart(body, bodyStart) {
  return body.lastIndexOf("\\item", bodyStart);
}

function renderList(env, option, body, ctx) {
  const items = splitItems(body);
  let tag = env === "enumerate" ? "ol" : "ul";
  let attrs = "";
  if (env === "enumerate" && option) {
    const type = option.match(/^\(?([aAiI1])[).]?\)?$/)?.[1];
    if (type) attrs = ` type="${type}"`;
  }
  if (items.some((it) => it.label)) {
    tag = "ul";
    attrs = ' style="list-style-type: none"';
  }
  const lis = items.map((it) => {
    const label = it.label ? `${renderInline(it.label, ctx)} ` : "";
    return `<li>${label}${renderInline(it.body, ctx)}</li>`;
  });
  return `<${tag}${attrs}>${lis.join("")}</${tag}>`;
}

function renderEnvironment(env, s, i, ctx) {
  // s[i] is just after \begin{env}
  const [option, afterOption] = env === "itemize" || env === "enumerate"
    ? readOptional(s, i)
    : [null, i];
  const [body, after] = readEnvironment(s, env, afterOption);
  let html;
  if (MATH_ENVS.has(env)) {
    html = math(`\\begin{${env}}${body}\\end{${env}}`, true);
    return [html, after, false];
  }
  switch (env) {
    case "itemize":
    case "enumerate":
      html = renderList(env, option, body, ctx);
      break;
    case "center":
      html = `<div style="text-align: center">${renderText(body, ctx)}</div>`;
      break;
    case "quote":
    case "quotation":
      html = `<blockquote>${renderText(body, ctx)}</blockquote>`;
      break;
    case "proof":
      html = renderText(`\\emph{Proof.} ${body}`, ctx);
      break;
    case "verbatim":
      html = `<pre style="white-space: pre-wrap">${escapeHtml(body.replace(/^\n/, ""))}</pre>`;
      break;
    default:
      warnUnknown(`begin{${env}}`, ctx.where);
      return [renderText(body, ctx), after, true];
  }
  return [html, after, true];
}

// Core text-mode renderer. Returns a string with BLOCK sentinels around
// block-level output and paragraph breaks; assemble() turns that into
// <p> wrapped HTML.
function renderChunks(s, ctx) {
  let out = "";
  let i = 0;
  const block = (html) => {
    out += `${BLOCK}${html}${BLOCK}`;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "$") {
      const display = s[i + 1] === "$";
      const open = display ? 2 : 1;
      let j = i + open;
      while (j < s.length) {
        if (s[j] === "\\") j += 2;
        else if (s[j] === "$") break;
        else j++;
      }
      if (j >= s.length) throw new Error(`Unclosed $ near: ${s.slice(i, i + 60)}`);
      out += math(s.slice(i + open, j), display);
      i = j + open;
      continue;
    }
    if (c === "\\") {
      if (s.startsWith("\\\\", i)) {
        const [, after] = readOptional(s, i + 2);
        out += "<br>";
        i = after;
        continue;
      }
      if (s.startsWith("\\[", i)) {
        const end = s.indexOf("\\]", i);
        if (end < 0) throw new Error("Unclosed \\[");
        out += math(s.slice(i + 2, end), true);
        i = end + 2;
        continue;
      }
      if (s.startsWith("\\(", i)) {
        const end = s.indexOf("\\)", i);
        if (end < 0) throw new Error("Unclosed \\(");
        out += math(s.slice(i + 2, end), false);
        i = end + 2;
        continue;
      }
      const next = s[i + 1];
      if (next === undefined) {
        i++;
        continue;
      }
      if (!/[a-zA-Z]/.test(next)) {
        // Single-character control sequence.
        i += 2;
        if (ACCENTS[next] && !/[a-zA-Z]/.test(next)) {
          const [base, after] = readAccentBase(s, i);
          out += (base + ACCENTS[next]).normalize("NFC");
          i = after;
        } else if (next === "&") out += "&amp;";
        else if (next === "," || next === ";" || next === ":") out += "&thinsp;";
        else if (next === " " || next === "\n") out += " ";
        else if (next === "!" || next === "-" || next === "/" || next === "@") out += "";
        else if (/[0-9]/.test(next)) {
          warnUnknown(next, ctx.where);
          out += next;
        } else out += escapeHtml(next); // \$ \% \# \_ \{ \}
        continue;
      }
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      if (s[j] === "*") j++;
      const name = s.slice(i + 1, j);
      // Skip the whitespace LaTeX swallows after a control word.
      while (j < s.length && (s[j] === " " || s[j] === "\n") && !s.startsWith("\n\n", j)) j++;
      i = j;

      if (name === "begin") {
        const [env, afterEnv] = readGroup(s, i);
        const [html, after, isBlock] = renderEnvironment(env.trim(), s, afterEnv, ctx);
        if (isBlock) block(html);
        else out += html;
        i = after;
        continue;
      }
      if (name === "end") {
        const [env, after] = readGroup(s, i);
        warnUnknown(`end{${env}}`, ctx.where);
        i = after;
        continue;
      }
      if (name === "item") {
        // \item outside a list environment.
        const [, after] = readOptional(s, i);
        warnUnknown("item", ctx.where);
        out += "<br>• ";
        i = after;
        continue;
      }
      if (name === "par") {
        out += BLOCK;
        continue;
      }
      if (name === "verb") {
        const delim = s[i];
        const end = s.indexOf(delim, i + 1);
        out += `<code>${escapeHtml(s.slice(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
      if (name === "includegraphics") {
        const [, afterOpt] = readOptional(s, i);
        const [file, after] = readGroup(s, afterOpt);
        out += ctx.image(file.trim());
        i = after;
        continue;
      }
      if (name === "url" || name === "href") {
        const [url, after] = readGroup(s, i);
        let text = url;
        i = after;
        if (name === "href") {
          const [label, afterLabel] = readGroup(s, i);
          text = renderInline(label, ctx);
          i = afterLabel;
        } else text = escapeHtml(url);
        out += `<a class="external" href="${escapeHtml(url)}">${text}</a>`;
        continue;
      }
      if (name === "section" || name === "section*" || name === "subsection" || name === "subsection*") {
        const [title, after] = readGroup(s, i);
        block(`<h3>${renderInline(title, ctx)}</h3>`);
        i = after;
        continue;
      }
      if (ACCENTS[name]) {
        const [base, after] = readAccentBase(s, i);
        out += (base + ACCENTS[name]).normalize("NFC");
        i = after;
        continue;
      }
      if (name in SIMPLE_COMMANDS) {
        out += SIMPLE_COMMANDS[name];
        continue;
      }
      if (name in WRAP_COMMANDS) {
        const [open, close] = WRAP_COMMANDS[name];
        const [arg, after] = readGroup(s, i);
        out += `${open}${renderInline(arg, ctx)}${close}`;
        i = after;
        continue;
      }
      if (DROP_COMMANDS.has(name)) {
        if (s[i] === "{") [, i] = readGroup(s, i);
        continue;
      }
      if (["em", "it", "bf", "tt", "sl", "sc", "rm", "sf"].includes(name)) {
        // {\em ...} style switches are handled by the group case below;
        // a bare one applies to the rest of the group we're in.
        const [open, close] = styleTags(name);
        out += `${open}${renderInline(s.slice(i), ctx)}${close}`;
        i = s.length;
        continue;
      }
      if (/^(tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)$/.test(name)) continue;
      if (name in MATH_COMMANDS) {
        // Math commands used outside math mode (e.g. "\boxed{12}.")
        // become inline math with their arguments.
        let raw = `\\${name}`;
        const [option, afterOption] = readOptional(s, i);
        if (option !== null) raw += `[${option}]`;
        i = afterOption;
        for (let k = 0; k < MATH_COMMANDS[name] && s[i] === "{"; k++) {
          const [arg, after] = readGroup(s, i);
          raw += `{${arg}}`;
          i = after;
        }
        out += math(raw, false);
        continue;
      }
      warnUnknown(name, ctx.where);
      out += escapeHtml(`\\${name}`);
      continue;
    }
    if (c === "{") {
      const [group, after] = readGroup(s, i);
      const style = group.match(/^\s*\\(em|it|bf|tt|sl|sc|rm|sf)(?![a-zA-Z])\s*/);
      if (style) {
        const [open, close] = styleTags(style[1]);
        out += `${open}${renderInline(group.slice(style[0].length), ctx)}${close}`;
      } else {
        out += renderChunks(group, ctx);
      }
      i = after;
      continue;
    }
    if (c === "}") {
      warnUnknown("}", ctx.where);
      i++;
      continue;
    }
    if (c === "\n") {
      let j = i;
      while (j < s.length && (s[j] === "\n" || s[j] === " " || s[j] === "\t")) j++;
      const newlines = s.slice(i, j).split("\n").length - 1;
      out += newlines >= 2 ? BLOCK : " ";
      i = j;
      continue;
    }
    if (c === "~") out += "&nbsp;";
    else if (c === "`") {
      if (s[i + 1] === "`") {
        out += "“";
        i++;
      } else out += "‘";
    } else if (c === "'") {
      if (s[i + 1] === "'") {
        out += "”";
        i++;
      } else out += "’";
    } else if (c === "-" && s.startsWith("---", i)) {
      out += "—";
      i += 2;
    } else if (c === "-" && s.startsWith("--", i)) {
      out += "–";
      i += 1;
    } else out += escapeHtml(c);
    i++;
  }
  return out;
}

function styleTags(name) {
  switch (name) {
    case "em":
    case "it":
    case "sl":
      return ["<i>", "</i>"];
    case "bf":
      return ["<b>", "</b>"];
    case "tt":
      return ["<code>", "</code>"];
    case "sc":
      return ['<span style="font-variant: small-caps">', "</span>"];
    default:
      return ["", ""];
  }
}

// Argument of an accent command: either a {group} or the next character
// (with \i / \j giving the dotless letters).
function readAccentBase(s, i) {
  while (s[i] === " ") i++;
  if (s[i] === "{") {
    const [group, after] = readGroup(s, i);
    return [group.replace(/\\i(?![a-zA-Z])/, "ı").replace(/\\j(?![a-zA-Z])/, "ȷ"), after];
  }
  if (s.startsWith("\\i", i)) return ["ı", i + 2];
  if (s.startsWith("\\j", i)) return ["ȷ", i + 2];
  return [s[i] ?? "", i + 1];
}

const BLOCK_START = /^<(ul|ol|div|h3|pre|blockquote)\b/;

function assemble(chunks, inline) {
  const parts = chunks
    .split(BLOCK)
    .map((p) => p.trim())
    .filter(Boolean);
  if (inline && parts.length === 1 && !BLOCK_START.test(parts[0])) return parts[0];
  return parts
    .map((p) => (BLOCK_START.test(p) ? p : `<p>${p}</p>`))
    .join("");
}

function renderText(tex, ctx) {
  return assemble(renderChunks(tex, ctx), false);
}

function renderInline(tex, ctx) {
  return assemble(renderChunks(tex, ctx), true);
}

// Entry point: full LaTeX body -> HTML. `image(file)` maps a figure file
// name to its <img> tag.
export function texToHtml(tex, image, where) {
  const src = tex.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  return renderText(src, { image, where });
}

// --- Archive walk ------------------------------------------------------

function pngSize(file) {
  const buf = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readTex(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

const underscores = (s) => s.replace(/ /g, "_");

function build() {
  const rounds = JSON.parse(fs.readFileSync(path.join(archive, "rounds.json"), "utf8"));

  // CMM held two editions in some years ("2010-fall", "2010-winter");
  // those get the season appended to the round name so the titles stay
  // distinct. Single-edition seasons just drop the suffix.
  const editions = new Map();
  for (const r of rounds) {
    const m = String(r.year).match(/^(\d{4})-(\w+)$/);
    if (!m) continue;
    const key = `${r.tournament} ${m[1]}`;
    if (!editions.has(key)) editions.set(key, new Set());
    editions.get(key).add(m[2]);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const index = {};
  const listed = {}; // tournament -> Set of rounds, for the constants check
  let problemCount = 0;
  let imageCount = 0;

  for (const r of rounds) {
    const tournament = TOURNAMENT_NAMES[r.tournament];
    if (!tournament) throw new Error(`Unknown tournament "${r.tournament}"`);
    let round = roundName(r.round);
    let year = r.year;
    const m = String(year).match(/^(\d{4})-(\w+)$/);
    if (m) {
      year = Number(m[1]);
      if (editions.get(`${r.tournament} ${m[1]}`).size > 1) {
        round += ` (${capitalize(m[2])})`;
      }
    }
    const test = `${tournament} ${round}`;
    const key = `${year} ${test}`;
    if (index[key] !== undefined) throw new Error(`Duplicate test ${key}`);

    const roundDir = path.join(archive, "..", r.path);
    const roundMeta = JSON.parse(fs.readFileSync(path.join(roundDir, "round.json"), "utf8"));
    const problems = {};
    const ratings = {};
    for (let n = 1; n <= r.num_problems; n++) {
      const dir = path.join(roundDir, String(n).padStart(2, "0"));
      const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
      // Estimation, proof, voided and similar problems are marked in the
      // archive (see its FORMAT.md) and don't make it onto the site.
      if (meta.excluded) continue;
      if (meta.difficulty == null || !meta.subject) {
        throw new Error(`${r.path}/${n}: no difficulty or subject in meta.json`);
      }
      ratings[n] = [meta.difficulty, meta.subject];
      const where = `${r.path}/${String(n).padStart(2, "0")}`;
      const image = (file) => {
        const src = path.join(dir, file);
        const target = path.join(outDir, underscores(key), `${n}-${file}`);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(src, target);
        imageCount++;
        // Crops are ~300 dpi; halve the width so they show near print
        // size (the site caps images at 100% width anyway).
        const { width } = pngSize(src);
        const url = `/data/tournaments/${underscores(key)}/${n}-${file}`;
        return `<img class="latexcenter" src="${url}" width="${Math.round(width / 2)}" alt="">`;
      };
      const problem = texToHtml(readTex(path.join(dir, "problem.tex")), image, where);
      const solutionTex = readTex(path.join(dir, "solution.tex"));
      const solutions = solutionTex
        ? texToHtml(solutionTex, image, where)
        : "<p><i>No official solution was published for this problem.</i></p>";
      problems[n] = {
        problem,
        solutions,
        answer: meta.answer ?? null,
      };
      problemCount++;
    }
    if (!Object.keys(ratings).length) continue;
    (listed[tournament] ??= new Set()).add(round);
    index[key] = ratings;
    fs.writeFileSync(
      path.join(outDir, `${underscores(key)}.json`),
      JSON.stringify(
        {
          test,
          year,
          name: roundMeta.round_name,
          url: roundMeta.source?.problems_url ?? null,
          problems,
        },
        undefined,
        2,
      ),
    );
  }

  const sortedIndex = Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })),
  );
  // One test per line keeps the file small and diffs readable.
  fs.writeFileSync(
    path.join(outDir, "index.json"),
    `{\n${Object.entries(sortedIndex)
      .map(([test, ratings]) => `  ${JSON.stringify(test)}: ${JSON.stringify(ratings)}`)
      .join(",\n")}\n}\n`,
  );

  console.log(
    `Wrote ${Object.keys(index).length} tests, ${problemCount} problems, ${imageCount} figures to ${outDir}/.`,
  );
  if (unknown.size) {
    console.warn("Unhandled commands:", Object.fromEntries(unknown));
  }

  // Keep TOURNAMENTS in src/lib/constants.js in sync with the data.
  const rank = (round) => {
    const base = round.replace(/ \(\w+\)$/, "");
    const idx = ROUND_ORDER.findIndex((code) => base.startsWith(ROUND_NAMES[code]));
    return [idx, round];
  };
  let mismatch = false;
  for (const [tournament, roundsSet] of Object.entries(listed)) {
    const actual = [...roundsSet].sort((a, b) => {
      const [ra, na] = rank(a);
      const [rb, nb] = rank(b);
      return ra - rb || na.localeCompare(nb);
    });
    const expected = TOURNAMENTS[tournament] ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      mismatch = true;
      console.warn(`TOURNAMENTS["${tournament}"] should be:\n  ${JSON.stringify(actual)}`);
    }
  }
  for (const tournament of Object.keys(TOURNAMENTS)) {
    if (!listed[tournament]) {
      mismatch = true;
      console.warn(`TOURNAMENTS["${tournament}"] has no data.`);
    }
  }
  if (!mismatch) console.log("TOURNAMENTS in src/lib/constants.js matches the data.");
}

// Only build when run directly; buildaops.js imports texToHtml.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
