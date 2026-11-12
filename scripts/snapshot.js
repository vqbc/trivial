// Saves every AoPS wiki page listed in public/data/allpages.json (except
// problems already in the bundled archive, public/data/aops/), the
// wiki-hosted images they use, the Theorems category and the list of
// redirect pages into public/data/, so the GitHub Pages build works without
// live AoPS access (AoPS blocks cross-origin requests; see aops-chrome.js).
// Resumable: pages and images already on disk are skipped, so rerun it to
// retry failures or pick up new pages. `npm run snapshot` refreshes the page
// lists (downloadlists.js) first.
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { aopsApiText, aopsImage } from "../aops-chrome.js";
import { normalizeTitle, wikiPath } from "../src/lib/wikiKey.js";

const DATA = path.resolve(import.meta.dirname, "../public/data");
const WIKI = path.join(DATA, "wiki");
const IMAGES = path.join(DATA, "images");
// Ends at a quote, whitespace, tag, query or fragment.
const WIKI_IMAGE =
  /(?:https?:)?\/\/artofproblemsolving\.com\/wiki\/images\/([^"'<>\s)?#]+)/g;

const api = async (query) => JSON.parse(await aopsApiText(query));
const pageFile = (title) => path.join(WIKI, wikiPath(title));
const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

// AoPS rate-limits (429 + challenge page) at 6 parallel requests, so go one
// at a time with a pause. ~19k pages takes several hours; it's resumable.
async function pool(label, items, fn, concurrency = 1) {
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < items.length) {
        await fn(items[next++]);
        await sleep(1000);
        if (++done % 250 === 0) console.log(`${label}: ${done}/${items.length}`);
      }
    }),
  );
}

// Search's "random theorem" needs the Theorems category; subject filters
// use the bundled categories (lib/aopsarchive.js) instead.
const categoriesFile = path.join(DATA, "categories.json");
if (!fs.existsSync(categoriesFile)) {
  const theorems = [];
  let cont = "";
  do {
    const json = await api(
      `action=query&list=categorymembers&cmtitle=Category:Theorems&cmlimit=max&format=json${cont}`,
    );
    theorems.push(...json.query.categorymembers.map((m) => m.title));
    cont = json.continue
      ? `&cmcontinue=${encodeURIComponent(json.continue.cmcontinue)}`
      : "";
  } while (cont);
  write(categoriesFile, JSON.stringify({ Theorems: theorems }));
}

// Bundled problems are served by lib/aopsarchive.js and never reach the
// snapshot, so don't fetch (or keep) a second copy.
const archive = JSON.parse(fs.readFileSync(path.join(DATA, "aops/index.json")));
const bundled = new Set(
  Object.entries(archive).flatMap(([test, nums]) =>
    nums.map((n) => normalizeTitle(`${test} Problems/Problem ${n}`)),
  ),
);

const titles = JSON.parse(fs.readFileSync(path.join(DATA, "allpages.json")));
// Problems and answer keys first, so a partial run is already useful.
const key = (t) => (/Problems\/Problem|Answer Key$/.test(t) ? 0 : 1);
const todo = titles
  .filter((t) => !bundled.has(normalizeTitle(t)) && !fs.existsSync(pageFile(t)))
  .sort((a, b) => key(a) - key(b));
console.log(`Pages: ${todo.length} of ${titles.length} to fetch`);
const failed = [];
await pool("Pages", todo, async (title) => {
  try {
    const json = await api(
      `action=parse&prop=text&redirects=1&format=json&page=${encodeURIComponent(title)}`,
    );
    if (!json.parse) return; // deleted since the page list was made
    const page = JSON.stringify({ title: json.parse.title, text: json.parse.text["*"] });
    if (normalizeTitle(json.parse.title) === normalizeTitle(title)) {
      write(pageFile(title), page);
    } else {
      write(pageFile(json.parse.title), page);
      write(pageFile(title), JSON.stringify({ title, redirect: json.parse.title }));
    }
  } catch (e) {
    failed.push(title);
    console.warn(`${title}: ${e.message}`);
  }
});

// One pass over the saved pages: redirects (Search hides them, like the
// live wiki search did) and the wiki images each page uses.
const saved = fs.readdirSync(WIKI).flatMap((dir) =>
  fs.readdirSync(path.join(WIKI, dir)).map((f) => path.join(WIKI, dir, f)),
);
const pages = saved.map((file) => {
  const page = JSON.parse(fs.readFileSync(file, "utf8"));
  const imgs = page.text ? [...page.text.matchAll(WIKI_IMAGE)].map((m) => m[1]) : [];
  return { file, title: page.title, redirect: page.redirect, imgs };
});
// Bundled problems aren't saved here, so their redirects come from the
// archive: an entry with `page` points at the shared problem it redirects
// to ("2014 AMC 12A Problems/Problem 9" -> the 10A #10 page).
const archiveRedirects = Object.keys(archive).flatMap((test) => {
  const file = path.join(DATA, "aops", `${test.replace(/ /g, "_")}.json`);
  const { problems } = JSON.parse(fs.readFileSync(file, "utf8"));
  return Object.entries(problems)
    .filter(([, entry]) => entry.page)
    .map(([n]) => `${test} Problems/Problem ${n}`);
});
write(
  path.join(DATA, "redirects.json"),
  JSON.stringify([
    ...pages.filter((p) => p.redirect).map((p) => p.title),
    ...archiveRedirects,
  ]),
);

// Drop bundled copies, unless a non-bundled redirect still points at one.
const keep = new Set(
  pages
    .filter((p) => p.redirect && !bundled.has(normalizeTitle(p.title)))
    .map((p) => normalizeTitle(p.redirect)),
);
const kept = pages.filter((p) => {
  const t = normalizeTitle(p.title);
  if (!bundled.has(t) || keep.has(t)) return true;
  fs.rmSync(p.file);
  return false;
});
console.log(`Pruned ${pages.length - kept.length} bundled pages`);

const images = new Set(kept.flatMap((p) => p.imgs));
// GitHub Pages decodes %xx in request paths, so save under the decoded name.
const imageFile = (img) => path.join(IMAGES, decodeURIComponent(img));
const imageTodo = [...images].filter((img) => !fs.existsSync(imageFile(img)));
console.log(`Images: ${imageTodo.length} of ${images.size} to fetch`);
await pool("Images", imageTodo, async (img) => {
  try {
    const res = await aopsImage(img);
    if (res.status === 200) write(imageFile(img), Buffer.from(res.body, "base64"));
    else console.warn(`${img}: HTTP ${res.status}`);
  } catch (e) {
    failed.push(img);
    console.warn(`${img}: ${e.message}`);
  }
});

// Remove images no remaining page uses.
const wanted = new Set([...images].map(imageFile));
const orphans = fs
  .readdirSync(IMAGES, { recursive: true })
  .map((f) => path.join(IMAGES, f))
  .filter((f) => fs.statSync(f).isFile() && !wanted.has(f));
for (const f of orphans) fs.rmSync(f);
console.log(`Removed ${orphans.length} unused images`);

console.log(failed.length ? `Done, ${failed.length} failed; rerun to retry.` : "Done.");
