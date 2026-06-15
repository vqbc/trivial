/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import { AOPS_WIKI } from "../lib/constants.js";
import {
  titleCleanup,
  underscores,
  validProblem,
} from "../lib/problems.js";
import { fetchArticlePage, fetchProblemPage } from "../lib/aops.js";
import { addHistory } from "../lib/history.js";
import { useWikiLinkClicks } from "../lib/links.js";
import { increment } from "../lib/stats.js";
import ProblemDisplay from "./ProblemDisplay.jsx";

function readPageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("page");
  if (!raw) return null;
  return decodeURIComponent(raw).replace(/_/g, " ");
}

export function ArticleBody({ pagename, html, onNavigate }) {
  const title = titleCleanup(pagename);
  const aopsHref = `${AOPS_WIKI}${underscores(pagename)}`;
  const bodyRef = useRef(null);

  useEffect(() => {
    document.title = `${title} - Trivial Math Practice`;
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, [title]);

  useWikiLinkClicks(bodyRef, onNavigate);

  return (
    <div className="problem-section" id="problem-section">
      <h2 className="section-header" id="article-header">
        {title}
      </h2>
      <div className="section-options">
        <a href={aopsHref} className="aops-link">
          View on the AoPS Wiki
        </a>{" "}
        ⋅{" "}
        <button
          className="text-button section-button"
          tabIndex={0}
          onClick={() => window.print()}
        >
          Print this page
        </button>
      </div>
      <div
        ref={bodyRef}
        className="article-text"
        id="full-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function NotFound({ pagename }) {
  useEffect(() => {
    document.title = "Error - Trivial Math Practice";
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, []);
  return (
    <div className="problem-section">
      <h2 className="section-header" id="article-header">
        Error
      </h2>
      <p className="error">
        The page <code>{pagename}</code> does not exist.
      </p>
    </div>
  );
}

export default function ArticleView() {
  const [pagename, setPagename] = useState(readPageFromUrl);
  const [state, setState] = useState({ kind: "pending" });

  useEffect(() => {
    const onPop = () => setPagename(readPageFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const onNavigate = (next) => {
    window.history.pushState({}, "", `?page=${underscores(next)}`);
    setPagename(next);
  };

  useEffect(() => {
    if (!pagename) {
      setState({ kind: "missing" });
      return;
    }
    let cancelled = false;
    setState({ kind: "pending" });

    (async () => {
      if (validProblem(pagename)) {
        const result = await fetchProblemPage(pagename);
        if (cancelled) return;
        if (!result || !result.problem) {
          setState({ kind: "not-found", pagename });
        } else {
          const finalPage = result.finalPage ?? pagename;
          addHistory(finalPage, result.problem);
          increment("numProblems");
          setState({
            kind: "problem",
            pagename: finalPage,
            problem: result.problem,
            solutions: result.solutions,
          });
        }
      } else {
        const result = await fetchArticlePage(pagename);
        if (cancelled) return;
        if (!result) {
          setState({ kind: "not-found", pagename });
        } else {
          const finalPage = result.finalPage ?? pagename;
          addHistory(finalPage, result.html);
          increment("numArticles");
          setState({
            kind: "article",
            pagename: finalPage,
            html: result.html,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pagename]);

  if (state.kind === "pending") {
    return <p className="intro-header">Loading {pagename}…</p>;
  }
  if (state.kind === "missing") {
    return (
      <p className="error">
        No page specified. Open a <code>?page=…</code> URL to view an article.
      </p>
    );
  }
  if (state.kind === "not-found") {
    return <NotFound pagename={state.pagename} />;
  }
  if (state.kind === "problem") {
    return (
      <ProblemDisplay
        pagename={state.pagename}
        problem={state.problem}
        solutions={state.solutions}
        onNavigate={onNavigate}
      />
    );
  }
  return (
    <ArticleBody
      pagename={state.pagename}
      html={state.html}
      onNavigate={onNavigate}
    />
  );
}
