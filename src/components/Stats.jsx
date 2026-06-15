/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useRef, useState } from "react";
import vegaEmbed from "vega-embed";
import { clearStats, readStats } from "../lib/stats.js";

function num(n) {
  return n.toLocaleString("en-US");
}

function buildSpec({ numCorrect, numRetry, numWrong, numAnswered }) {
  const pct =
    numAnswered > 0
      ? (((numCorrect + numRetry) / numAnswered) * 100).toFixed(1) + "%"
      : "0%";
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    description: "Answer breakdown",
    data: {
      values: [
        {
          Answers: "Correct",
          value: numCorrect,
          text: numCorrect ? `${numCorrect}✓` : "",
          sortOrder: 1,
        },
        {
          Answers: "Retry",
          value: numRetry,
          text: numRetry ? `${numRetry}↻` : "",
          sortOrder: 2,
        },
        {
          Answers: "Incorrect",
          value: numWrong,
          text: numWrong ? `${numWrong}✗` : "",
          sortOrder: 3,
        },
      ],
    },
    encoding: {
      theta: { field: "value", type: "quantitative", stack: true },
      color: {
        field: "Answers",
        type: "nominal",
        legend: null,
        scale: {
          domain: ["Correct", "Retry", "Incorrect"],
          range: [
            "var(--correct-color)",
            "var(--retry-color)",
            "var(--wrong-color)",
          ],
        },
        sort: { field: "sortOrder" },
      },
      order: { field: "sortOrder", type: "ordinal" },
    },
    layer: [
      { mark: { type: "arc", innerRadius: 50, outerRadius: 80 } },
      {
        mark: {
          type: "text",
          radius: 100,
          fontSize: 15,
          fontWeight: "bold",
        },
        encoding: {
          text: {
            field: "text",
            type: "nominal",
            sort: { field: "sortOrder" },
          },
        },
      },
      {
        mark: {
          type: "text",
          fill: "var(--minor-color)",
          align: "center",
          baseline: "middle",
          dy: 11,
          fontSize: 16,
        },
        encoding: { text: { value: "correct" } },
      },
      {
        mark: {
          type: "text",
          fill: "var(--minor-color)",
          align: "center",
          baseline: "middle",
          dx: 1,
          dy: -7,
          font: "'Latin Modern Sans Demi-Condensed', sans-serif",
          fontSize: 20,
        },
        encoding: { text: { value: pct } },
      },
    ],
    background: null,
    config: { font: "'Latin Modern Sans', 'Inter', sans-serif" },
  };
}

function StatsChart({ stats }) {
  const ref = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (stats.numAnswered <= 0) return;
    let cancelled = false;
    vegaEmbed(ref.current, buildSpec(stats), {
      actions: false,
      renderer: "svg",
    })
      .then((result) => {
        if (cancelled) {
          result.view.finalize();
          return;
        }
        viewRef.current = result.view;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      viewRef.current?.finalize?.();
      viewRef.current = null;
    };
  }, [stats]);

  return <div id="stats-chart" ref={ref} />;
}

export default function Stats() {
  const [stats, setStats] = useState(() => readStats());

  useEffect(() => {
    document.title = "Statistics - Trivial Math Practice";
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, []);

  const onClear = () => {
    clearStats();
    setStats(readStats());
  };

  return (
    <div className="problem-section" id="about-section">
      <h2 className="section-header" id="about-header">
        Your Statistics
      </h2>
      <div className="article-text" id="about-text">
        <StatsChart stats={stats} />
        <p className="list-head">
          Total problems generated:{" "}
          <span id="num-problems">{num(stats.numProblems)}</span>
        </p>
        <ul className="list-indent">
          <li className="list list-answered">
            Total answered:{" "}
            <span id="num-answered">{num(stats.numAnswered)}</span>
            <ul className="list-inner">
              <li className="list-minor list-correct">
                Total correct on first try:{" "}
                <span id="num-correct">{num(stats.numCorrect)}</span>
              </li>
              <li className="list-minor list-retry">
                Total correct on retry:{" "}
                <span id="num-retry">{num(stats.numRetry)}</span>
              </li>
              <li className="list-minor list-wrong">
                Total given up on:{" "}
                <span id="num-wrong">{num(stats.numWrong)}</span>
              </li>
            </ul>
          </li>
          <li className="list list-today">
            Answered today: <span id="num-today">{num(stats.numToday)}</span>
          </li>
          <li className="list list-streak">
            Longest streak: <span id="num-streak">{num(stats.numStreak)}</span>
          </li>
        </ul>
        <p className="list-head">
          Total problem sets generated:{" "}
          <span id="num-sets">{num(stats.numSets)}</span>
        </p>
        <p className="list-head">
          Total articles viewed:{" "}
          <span id="num-articles">{num(stats.numArticles)}</span>
        </p>
        <button
          type="button"
          className="text-button"
          id="clear-button"
          onClick={onClear}
        >
          <span className="feedback-icon">✗</span> Clear stats forever
        </button>
        <div className="stats-notes">
          <p className="brag">
            Over two million problems and problem sets have been generated using
            Trivial!
          </p>
        </div>
      </div>
    </div>
  );
}
