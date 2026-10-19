/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useState } from "react";
import { toggleProps } from "../lib/toggle.js";
import {
  titleCleanup,
  underscores,
  computeTest,
  isTournamentTest,
  normalizeAnswerInput,
} from "../lib/problems.js";
import { fetchAnswer } from "../lib/aops.js";
import { inArchive } from "../lib/aopsarchive.js";
import { AOPS_API } from "../lib/constants.js";

const STAT_TESTS = new Set([
  "AMC 8",
  "AMC 10A",
  "AMC 10B",
  "AMC 12A",
  "AMC 12B",
  "AIME I",
  "AIME II",
]);

const STAT_MATCH = /floor|cutoff|roll|DHR|Distinction|Median|Average/i;

function ProblemBlock({
  index,
  problem,
  showSolution,
  breakHere,
  hideSource,
  onReplace,
  replacing,
}) {
  const title = titleCleanup(problem.title);
  const style = breakHere ? { breakAfter: "page" } : undefined;
  const sourceCls = `source-link${hideSource ? " source-link-hidden" : ""}`;
  return (
    <div
      className="article-problem"
      data-index={index + 1}
      data-difficulty={problem.difficulty}
      style={style}
    >
      <h2 className="problem-heading">
        Problem {index + 1} {" "}
        <span className={sourceCls}>
          (
          <a
            className="source-link-a"
            href={`/?page=${underscores(problem.title)}`}
          >
            {title}
          </a>
          )
        </span>
        {onReplace && (
          <button
            type="button"
            className="text-button replace-problem"
            disabled={replacing}
            onClick={onReplace}
          >
            {replacing ? "(Replacing…)" : "(Replace problem)"}
          </button>
        )}
      </h2>
      <div dangerouslySetInnerHTML={{ __html: problem.problem }} />
      {showSolution && (
        <>
          <div className="solutions-divider">Solution</div>
          <div dangerouslySetInnerHTML={{ __html: problem.solutions }} />
        </>
      )}
    </div>
  );
}

async function loadAnswerKey(test) {
  const params = `action=parse&page=${test} Answer Key&format=json&origin=*`;
  const res = await fetch(`${AOPS_API}?${params}`);
  return res.json();
}

async function fetchAmcStats(testName, testYear) {
  const params = `action=parse&page=AMC_historical_results&format=json&origin=*`;
  const res = await fetch(`${AOPS_API}?${params}`);
  const json = await res.json();
  const html = json?.parse?.text?.["*"];
  if (!html) return [];
  const div = document.createElement("div");
  div.innerHTML = html;

  // Walk top-level children: find the <h2> whose text mentions the year,
  // then after it the next <h3> mentioning the test name, then the next
  // <ul> after that.
  const children = Array.from(div.children);
  const yearIdx = children.findIndex(
    (el) => el.tagName === "H2" && el.textContent.includes(testYear),
  );
  if (yearIdx < 0) return [];
  const after = children.slice(yearIdx + 1);
  const relH3 = after.findIndex(
    (el) => el.tagName === "H3" && el.textContent.includes(testName),
  );
  if (relH3 < 0) return [];
  const ul = after.slice(relH3 + 1).find((el) => el.tagName === "UL");
  if (!ul) return [];

  return Array.from(ul.children)
    .map((li) =>
      li.textContent
        .replace("Distinguished Honor Roll", "DHR")
        .replace("Honor roll", "Honor Roll")
        .trim(),
    )
    .filter((s) => STAT_MATCH.test(s) && /\d/.test(s));
}

function ScoringOptions({ mode, amcScoring, onMode, onAmcScoring }) {
  return (
    <div className="input-container checkbox-container input-flexone-full">
      <div className="checkbox-wrap">
        <div className="radio-block">
          <input
            type="radio"
            name="input-feedback"
            id="score-only"
            value="score-only"
            checked={mode === "score-only"}
            onChange={() => onMode("score-only")}
          />{" "}
          <label className="checkbox-label" htmlFor="score-only">
            Only show score
          </label>
        </div>
        <div className="radio-block">
          <input
            type="radio"
            name="input-feedback"
            id="check-only"
            value="check-only"
            checked={mode === "check-only"}
            onChange={() => onMode("check-only")}
          />{" "}
          <label className="checkbox-label" htmlFor="check-only">
            Only mark questions
          </label>
        </div>
        <div className="radio-block">
          <input
            type="radio"
            name="input-feedback"
            id="show-ans"
            value="show-ans"
            checked={mode === "show-ans"}
            onChange={() => onMode("show-ans")}
          />{" "}
          <label className="checkbox-label" htmlFor="show-ans">
            Show correct answers
          </label>
        </div>
        <div className="radio-block">
          <input
            type="checkbox"
            className="input-check"
            id="input-amc"
            checked={amcScoring}
            onChange={(e) => onAmcScoring(e.target.checked)}
          />{" "}
          <label className="checkbox-label" htmlFor="input-amc">
            Use AMC 10/12 scoring
          </label>
        </div>
      </div>
    </div>
  );
}

function BatchAnswerCheck({ problems, testName, testYear }) {
  const [answers, setAnswers] = useState(null);
  // Typed answers by problem title, so replacing one problem in a set
  // keeps the answers to the others.
  const [inputs, setInputs] = useState({});
  const [scored, setScored] = useState(false);
  const [mode, setMode] = useState("show-ans");
  const [amcScoring, setAmcScoring] = useState(false);
  const [amcStats, setAmcStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setScored(false);
    setAmcStats(null);

    // Tournament and bundled AoPS answers come from the archive data
    // (lib/tournaments.js, lib/aopsarchive.js) rather than a wiki answer
    // key.
    const isBundled = (p) =>
      isTournamentTest(computeTest(p.title)) || inArchive(p.title);
    const tests = [
      ...new Set(
        problems
          .filter((p) => !isBundled(p))
          .map((p) => p.title.split(" Problems/Problem")[0]),
      ),
    ];
    Promise.all([
      Promise.all(tests.map(loadAnswerKey)),
      Promise.all(problems.map((p) => (isBundled(p) ? fetchAnswer(p.title) : null))),
    ]).then(([jsons, bundledAnswers]) => {
      if (cancelled) return;
      const byTest = {};
      jsons.forEach((json, i) => (byTest[tests[i]] = json));
      const result = problems.map((p, i) => {
        if (isBundled(p)) return bundledAnswers[i];
        const test = p.title.split(" Problems/Problem")[0];
        const num = Number(p.title.match(/\d+$/)[0]);
        const text = byTest[test]?.parse?.text?.["*"];
        if (!text) return null;
        const tmp = document.createElement("div");
        tmp.innerHTML = text;
        return tmp.querySelectorAll("ol li")[num - 1]?.textContent ?? null;
      });
      setAnswers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [problems]);

  // Fetch AMC historical stats once the user has hit Check Answers and
  // the test is one we have stats for.
  useEffect(() => {
    if (!scored) return;
    if (!testName || !testYear) return;
    if (!STAT_TESTS.has(testName)) return;
    let cancelled = false;
    fetchAmcStats(testName, testYear).then((stats) => {
      if (!cancelled) setAmcStats(stats);
    });
    return () => {
      cancelled = true;
    };
  }, [scored, testName, testYear]);

  if (!answers || answers.every((a) => a === null)) return null;

  const check = (index) => {
    const pagename = problems[index].title;
    const normalized = normalizeAnswerInput(inputs[pagename] ?? "", pagename);
    if (!normalized) return { state: "blank", expected: answers[index] };
    const raw = normalized;
    const correct =
      normalized === answers[index] ||
      (pagename === "2012 AMC 12B Problems/Problem 12" &&
        (normalized === "D" || normalized === "E")) ||
      (pagename === "2015 AMC 10A Problems/Problem 20" && normalized === "B") ||
      (pagename === "2022 AIME II Problems/Problem 8" &&
        (normalized === "080" || normalized === "081"));
    return { state: correct ? "right" : "wrong", expected: answers[index], raw };
  };

  // Problems without an answer key (e.g. olympiad ones) have no answer
  // box, so they don't count toward the score.
  const scores = scored
    ? problems.map((_, i) => (answers[i] ? check(i) : null))
    : null;
  const checked = scores?.filter(Boolean) ?? [];
  const right = checked.filter((s) => s.state === "right").length;
  const blank = checked.filter((s) => s.state === "blank").length;
  const total = answers.filter(Boolean).length;

  const sectionCls = `problem-section batchans-${mode === "score-only"
    ? "scoreonly"
    : mode === "check-only"
      ? "checkonly"
      : "showans"} ${amcScoring ? "batchans-amcscore" : ""}`.trim();

  return (
    <div className={sectionCls} id="batchans-section">
      <h2 className="section-header" id="batchans-header">
        Answer Check<span className="header-minor"> (opt.)</span>
      </h2>
      <div className="answer-list">
        {problems.map((p, i) =>
          answers[i] ? (
            <div className="answer-box" key={i} data-answer={answers[i]}>
              <span className="answer-num">{i + 1}</span>
              <input
                className="input-field input-batchans"
                type="text"
                placeholder="Enter answer"
                value={inputs[p.title] ?? ""}
                onChange={(e) =>
                  setInputs({ ...inputs, [p.title]: e.target.value })
                }
              />
              {scores && (
                <span
                  className={`feedback-item ${
                    scores[i].state === "right"
                      ? "correct-feedback"
                      : scores[i].state === "wrong"
                      ? "wrong-feedback"
                      : "blank-feedback"
                  }`}
                >
                  <span className="feedback-icon">
                    {scores[i].state === "right"
                      ? "✓"
                      : scores[i].state === "wrong"
                      ? "✗"
                      : "—"}
                  </span>
                  {scores[i].state !== "right" && (
                    <span className="feedback-answer">
                      {" "}
                      ({scores[i].expected})
                    </span>
                  )}
                </span>
              )}
            </div>
          ) : null,
        )}
      </div>
      <div className="options-input batchans-options">
        <ScoringOptions
          mode={mode}
          amcScoring={amcScoring}
          onMode={setMode}
          onAmcScoring={setAmcScoring}
        />
        <button
          type="button"
          className="input-button input-button-flexone-full"
          onClick={() => setScored(true)}
        >
          Check Answers
        </button>
      </div>
      {scored && (
        <div className="score-box">
          <p className="score-line" id="number-score">
            Correct: {right}/{total}
          </p>
          <p className="score-line" id="amc-score">
            <span className="score-num">
              Score: {right * 6 + blank * 1.5}
            </span>
          </p>
          {amcStats && amcStats.length > 0 && (
            <p className="score-line amc-stats" id="amc-stats">
              {amcStats.join(", ")}{" "}
              <a href="?page=AMC_historical_results">(link)</a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CopyButton({ problems }) {
  const [state, setState] = useState("idle");

  const onClick = async () => {
    const text = problems.map((p) => titleCleanup(p.title)).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1500);
  };

  return (
    <button
      type="button"
      className="text-button section-button"
      id="copy-problems"
      onClick={onClick}
      title="Copy a comma-separated problem list to the clipboard, e.g. for re-pasting into the Custom Set tab."
    >
      {state === "copied"
        ? "Copied!"
        : state === "error"
        ? "Couldn't copy"
        : "Copy problem list"}
    </button>
  );
}

export default function BatchDisplay({
  title,
  problems,
  breakEvery,
  hideSource,
  onReplace,
  testName,
  testYear,
}) {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [replacing, setReplacing] = useState(null);

  useEffect(() => {
    document.title = `${title} - Trivial Math Practice`;
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, [title]);

  useEffect(() => {
    setReplacing(null);
  }, [problems]);

  const isBreakAt = (i) =>
    breakEvery && breakEvery > 0 && (i + 1) % breakEvery === 0;

  const handleReplace = onReplace
    ? (i) => {
        setReplacing(i);
        onReplace(i);
      }
    : null;

  return (
    <>
      <div className="problem-section" id="problem-section">
        <h2 className="section-header" id="batch-header">
          {title}
        </h2>
        <div className="section-options">
          <CopyButton problems={problems} /> ⋅{" "}
          <button
            className="text-button section-button"
            tabIndex={0}
            onClick={() => window.print()}
          >
            Print this page
          </button>
        </div>
        <div className="article-text" id="batch-text">
          {problems.map((p, i) => (
            <ProblemBlock
              key={p.title}
              index={i}
              problem={p}
              breakHere={isBreakAt(i)}
              hideSource={hideSource}
              onReplace={handleReplace ? () => handleReplace(i) : null}
              replacing={replacing === i}
            />
          ))}
        </div>
      </div>
      <BatchAnswerCheck
        problems={problems}
        testName={testName}
        testYear={testYear}
      />
      <div
        className={`problem-section ${
          solutionsOpen ? "" : "section-collapsed"
        }`}
        id="solutions-section"
      >
        <h2
          className="section-header collapse-header"
          id="solutions-header"
          {...toggleProps(() => setSolutionsOpen((v) => !v), solutionsOpen)}
        >
          Solutions
        </h2>
        <div className="article-text batch-solutions-text" id="solutions-text">
          {problems.map((p, i) => (
            <ProblemBlock
              key={p.title}
              index={i}
              problem={p}
              showSolution
              breakHere={isBreakAt(i)}
              hideSource={hideSource}
            />
          ))}
        </div>
      </div>
    </>
  );
}
