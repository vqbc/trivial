/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useRef, useState } from "react";
import { AOPS_WIKI } from "../lib/constants.js";
import { titleCleanup, underscores, sanitize, computeTest } from "../lib/problems.js";
import { fetchAnswer } from "../lib/aops.js";
import { useWikiLinkClicks } from "../lib/links.js";
import { increment } from "../lib/stats.js";

function isCorrect(pagename, normalized, answer) {
  return (
    normalized === answer ||
    (pagename === "2012 AMC 12B Problems/Problem 12" &&
      (normalized === "D" || normalized === "E")) ||
    (pagename === "2015 AMC 10A Problems/Problem 20" && normalized === "B") ||
    (pagename === "2022 AIME II Problems/Problem 8" &&
      (normalized === "080" || normalized === "081"))
  );
}

function AnswerCheck({ pagename, onAttempt }) {
  const [answer, setAnswer] = useState(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setAnswer(null);
    setInput("");
    setFeedback([]);
    fetchAnswer(pagename).then((a) => {
      if (!cancelled) setAnswer(a);
    });
    return () => {
      cancelled = true;
    };
  }, [pagename]);

  if (!answer) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    const original = sanitize(input).toUpperCase();
    if (!original) return;
    const normalized =
      computeTest(pagename) === "AIME" ? original.padStart(3, "0") : original;
    const correct = isCorrect(pagename, normalized, answer);
    onAttempt(correct);
    setFeedback((prev) => [
      {
        id: Date.now() + Math.random(),
        text: correct
          ? `${original} is correct! :)`
          : `${original} is wrong :(`,
        correct,
      },
      ...prev,
    ]);
    setInput("");
  };

  return (
    <div className="answer-check">
      <form className="options-input answer-options" onSubmit={onSubmit}>
        <input
          className="input-field"
          id="input-answer"
          type="text"
          placeholder="Enter answer (optional)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="input-button" id="answer-button">
          Check Answer
        </button>
      </form>
      <div className="answer-feedback">
        {feedback.map((f) => (
          <div
            key={f.id}
            className={`feedback-item ${
              f.correct ? "correct-feedback" : "wrong-feedback"
            }`}
          >
            {f.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProblemDisplay({
  pagename,
  problem,
  solutions,
  onResult,
  onNavigate,
}) {
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [tries, setTries] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const aopsHref = `${AOPS_WIKI}${underscores(pagename)}`;
  const title = titleCleanup(pagename);
  const problemRef = useRef(null);
  const solutionsRef = useRef(null);
  useWikiLinkClicks(problemRef, onNavigate);
  useWikiLinkClicks(solutionsRef, onNavigate);

  useEffect(() => {
    document.title = `${title} - Trivial Math Practice`;
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, [title]);

  // Reset per-problem answer state when the page changes.
  useEffect(() => {
    setSolutionsOpen(false);
    setTries(0);
    setResolved(false);
    setGaveUp(false);
  }, [pagename]);

  const onAttempt = (correct) => {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (nextTries === 1) {
      increment("numAnswered");
      increment("numToday");
    }
    if (correct && !resolved) {
      const result = nextTries === 1 ? "right" : "retry";
      increment(result === "right" ? "numCorrect" : "numRetry");
      setResolved(true);
      onResult?.(result);
    }
  };

  const onToggleSolutions = () => {
    if (!solutionsOpen && !resolved && !gaveUp) {
      const result = tries > 0 ? "wrong" : "blank";
      setGaveUp(true);
      onResult?.(result);
    }
    setSolutionsOpen((v) => !v);
  };

  return (
    <>
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
          ref={problemRef}
          className="article-text"
          id="problem-text"
          dangerouslySetInnerHTML={{ __html: problem }}
        />
        <AnswerCheck pagename={pagename} onAttempt={onAttempt} />
      </div>
      <div
        className={`problem-section ${
          solutionsOpen ? "" : "section-collapsed"
        }`}
        id="solutions-section"
      >
        <h2
          className="section-header collapse-header"
          id="solutions-header"
          onClick={onToggleSolutions}
        >
          Solutions
        </h2>
        <div
          ref={solutionsRef}
          className="article-text"
          id="solutions-text"
          dangerouslySetInnerHTML={{ __html: solutions }}
        />
      </div>
    </>
  );
}
