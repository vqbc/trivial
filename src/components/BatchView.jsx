/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import { fetchProblemBatch } from "../lib/aops.js";
import { addHistoryBatch } from "../lib/history.js";
import { increment } from "../lib/stats.js";
import BatchDisplay from "./BatchDisplay.jsx";

function readBatchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("problems");
  if (!raw) return null;
  const titles = raw
    .split("|")
    .map((e) => e.replace(/_/g, " ").replace("#", "Problems/Problem "))
    .filter(Boolean);
  return {
    titles,
    testYear: params.get("testyear"),
    testName: params.get("testname"),
  };
}

function LoadingBar({ progress }) {
  return (
    <div className="loading-notice">
      <div className="loading-text">
        Loading problems… {progress.done}/{progress.total}
      </div>
      <div className="loading-bar-container">
        <div
          className="loading-bar"
          style={{
            width: progress.total
              ? `${(progress.done / progress.total) * 100}%`
              : "0%",
          }}
        />
      </div>
    </div>
  );
}

export default function BatchView() {
  const [spec, setSpec] = useState(readBatchFromUrl);
  const [state, setState] = useState({ kind: "pending" });
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const onPop = () => setSpec(readBatchFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!spec || spec.titles.length === 0) {
      setState({ kind: "missing" });
      return;
    }
    let cancelled = false;
    setState({ kind: "pending" });
    setProgress({ done: 0, total: spec.titles.length });

    (async () => {
      const problems = await fetchProblemBatch(spec.titles, {
        onProgress: (done, total) => {
          if (!cancelled) setProgress({ done, total });
        },
      });
      if (cancelled) return;
      if (problems.length === 0) {
        setState({ kind: "not-found" });
        return;
      }
      const title =
        spec.testYear && spec.testName
          ? `${spec.testYear} ${spec.testName}`
          : "Problem Set";
      addHistoryBatch(
        problems.map((p) => p.title),
        problems[0].problem,
        title,
        spec.testYear,
        spec.testName,
      );
      increment("numSets");
      setState({
        kind: "ready",
        title,
        problems,
        testName: spec.testName ?? null,
        testYear: spec.testYear ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [spec]);

  if (state.kind === "missing") {
    return (
      <p className="error">
        No problems specified. Open a <code>?problems=…</code> URL to view a
        batch.
      </p>
    );
  }
  if (state.kind === "pending") {
    return <LoadingBar progress={progress} />;
  }
  if (state.kind === "not-found") {
    return (
      <div className="problem-section">
        <h2 className="section-header" id="batch-header">
          Error
        </h2>
        <p className="error">No problems could be loaded for that set.</p>
      </div>
    );
  }
  return (
    <BatchDisplay
      title={state.title}
      problems={state.problems}
      testName={state.testName}
      testYear={state.testYear}
    />
  );
}
