/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useRef, useState } from "react";
import { AOPS_API } from "../lib/constants.js";
import { titleCleanup, underscores, validProblem } from "../lib/problems.js";
import { fetchAllPages } from "../lib/aops.js";
import Tagify from "./Tagify.jsx";

const PAGE_SIZE = 10;

async function checkPageExists(search) {
  const params = `action=parse&page=${encodeURIComponent(
    underscores(search),
  )}&format=json&origin=*`;
  const res = await fetch(`${AOPS_API}?${params}`);
  const json = await res.json();
  return Boolean(json?.parse);
}

async function fetchAllSearchResults(search) {
  const baseParams =
    `action=query&list=search&srwhat=text&srsearch=${encodeURIComponent(
      search,
    )}` + `&srlimit=max&srqiprofile=wsum_inclinks_pv&format=json&origin=*`;
  const out = [];
  let url = `${AOPS_API}?${baseParams}`;
  while (true) {
    const res = await fetch(url);
    const json = await res.json();
    for (const page of json?.query?.search ?? []) out.push(page);
    if (!json?.continue) break;
    url = `${AOPS_API}?${baseParams}&sroffset=${json.continue.sroffset}`;
  }
  return out;
}

let theoremCache = null;

async function fetchTheorems() {
  if (theoremCache) return theoremCache;
  const params =
    `action=query&list=categorymembers&cmtitle=Category:Theorems` +
    `&cmlimit=max&format=json&origin=*`;
  const res = await fetch(`${AOPS_API}?${params}`);
  const json = await res.json();
  theoremCache = (json?.query?.categorymembers ?? [])
    .map((p) => p.title)
    .filter((t) => t !== "H�lder's Inequality" && t !== "Theorems");
  return theoremCache;
}

function ResultItem({ result }) {
  return (
    <div className="result-item">
      <h2 className="result-title">
        <a className="result-link" href={result.url}>
          {result.title}
        </a>
      </h2>
      <p
        className="result-snippet"
        dangerouslySetInnerHTML={{ __html: result.snippet }}
      />
    </div>
  );
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [pageExists, setPageExists] = useState(false);
  const [shown, setShown] = useState(0);
  const [theoremPending, setTheoremPending] = useState(false);
  const [pages, setPages] = useState(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchAllPages().then((p) => {
      if (!cancelled) setPages(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-filter the result list when the "problems only" checkbox flips,
  // without re-querying the API.
  const [raw, setRaw] = useState(null);
  useEffect(() => {
    if (!raw) {
      setResults(null);
      return;
    }
    const filtered = raw
      .filter((page) => {
        const blocksRedirect =
          page.snippet.indexOf("#REDIRECT") +
            page.snippet.indexOf("#redirect") +
            page.title.indexOf("�") ===
          -3;
        if (!blocksRedirect) return false;
        if (problemsOnly && !validProblem(page.title)) return false;
        return true;
      })
      .map((page) => ({
        url: `?page=${encodeURIComponent(underscores(page.title))}`,
        title: titleCleanup(page.title),
        snippet: page.snippet,
      }));
    setResults(filtered);
    setShown(Math.min(PAGE_SIZE, filtered.length));
  }, [raw, problemsOnly]);

  const onSearch = async () => {
    setError(null);
    const original = query.trim();
    if (!original) {
      setError("No search terms were entered.");
      setResults(null);
      setRaw(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    setPending(true);
    try {
      let normalized = original
        .replace(/’/g, "'")
        .replace("#", "Problems/Problem ");
      normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

      const [exists, all] = await Promise.all([
        checkPageExists(normalized),
        fetchAllSearchResults(normalized),
      ]);
      if (reqId !== reqIdRef.current) return;
      setPageExists(exists);
      setRaw(all);
      document.title = `Search results for ${original} - Trivial Math Practice`;
    } finally {
      if (reqId === reqIdRef.current) setPending(false);
    }
  };

  const onRandomTheorem = async () => {
    setTheoremPending(true);
    try {
      const theorems = await fetchTheorems();
      if (theorems.length === 0) {
        setError("Could not load theorems list.");
        return;
      }
      const pick = theorems[Math.floor(Math.random() * theorems.length)];
      window.location.search = `?page=${encodeURIComponent(underscores(pick))}`;
    } finally {
      setTheoremPending(false);
    }
  };

  const onTagChange = (vals) => setQuery(vals[0] ?? "");

  const aopsHref = query
    ? `https://artofproblemsolving.com/wiki/index.php/${encodeURIComponent(
        underscores(query.trim()),
      )}`
    : null;

  return (
    <>
      <div className="options-input" id="search-input">
        <div className="input-container checkbox-container checkbox-container-smaller input-flexino-full">
          <div className="checkbox-wrap">
            <input
              type="checkbox"
              className="input-check"
              id="input-problemsonly"
              checked={problemsOnly}
              onChange={(e) => setProblemsOnly(e.target.checked)}
            />
            <label className="checkbox-label" htmlFor="input-problemsonly">
              Show problems only
            </label>
          </div>
        </div>
        <Tagify
          value={query ? [query] : []}
          onChange={onTagChange}
          whitelist={pages ?? []}
          mode="select"
          placeholder="Keywords (e.g. Cauchy)"
          dropdownMax={7}
          dropdownEnabled={2}
          className="input-end"
        />
        <button
          type="button"
          className="input-button input-button-half"
          id="search-button"
          disabled={pending}
          onClick={onSearch}
        >
          {pending ? "Searching…" : "Search!"}
        </button>
        <button
          type="button"
          className="input-button input-button-half"
          id="theorem-button"
          disabled={theoremPending}
          onClick={onRandomTheorem}
        >
          {theoremPending ? "Loading…" : "Random Theorem"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {results && (
        <div className="results-container">
          <span className="results-notice">
            {results.length} results found
            {pageExists && aopsHref && (
              <>
                {" "}
                | <a href={aopsHref}>{titleCleanup(query.trim())}</a> exists on
                the wiki
              </>
            )}
          </span>
          {results.slice(0, shown).map((r) => (
            <ResultItem key={r.url} result={r} />
          ))}
          {shown < results.length && (
            <button
              type="button"
              className="text-button"
              id="load-results"
              onClick={() =>
                setShown((s) => Math.min(s + PAGE_SIZE, results.length))
              }
            >
              Load more…
            </button>
          )}
        </div>
      )}
    </>
  );
}
