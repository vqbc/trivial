/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import {
  SUBJECTS,
  TESTS,
  VALID_NUMS,
  VALID_VERSIONS,
  VALID_YEARS,
  YEAR_MIN,
  YEAR_MAX,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
} from "../lib/constants.js";
import { fullTestName, underscores } from "../lib/problems.js";
import {
  collectMatchingProblems,
  fetchAllProblems,
  fetchProblemPage,
} from "../lib/aops.js";
import { addHistory } from "../lib/history.js";
import { bumpStreakIfLonger, increment } from "../lib/stats.js";
import RangeSlider from "./RangeSlider.jsx";
import Tagify from "./Tagify.jsx";
import ProblemDisplay from "./ProblemDisplay.jsx";
import SessionProgress from "./SessionProgress.jsx";

const DifficultyChart = lazy(() => import("./DifficultyChart.jsx"));

const EMPTY_SESSION = {
  streak: 0,
  right: 0,
  retry: 0,
  blank: 0,
  wrong: 0,
  ready: false,
};

function SecondaryNav({ tab, onTab }) {
  return (
    <div className="button-container" id="secondary-button-container">
      <button
        type="button"
        className={`button secondary-button ${
          tab === "random" ? "secondary-button-active" : ""
        }`}
        onClick={() => onTab("random")}
      >
        Random
      </button>
      <button
        type="button"
        className={`button secondary-button ${
          tab === "select" ? "secondary-button-active" : ""
        }`}
        onClick={() => onTab("select")}
      >
        Select
      </button>
      <div className="secondary-spacer" />
    </div>
  );
}

function RandomTab({ preset, hasProblem, onResult }) {
  const [subjects, setSubjects] = useState(preset?.subjects ?? []);
  const [tests, setTests] = useState(preset?.tests ?? []);
  const [showDifficultyInfo, setShowDifficultyInfo] = useState(false);
  const [yearRange, setYearRange] = useState(
    preset?.yearRange ?? [2010, YEAR_MAX - 2],
  );
  const [diffRange, setDiffRange] = useState(
    preset?.diffRange ?? [DIFFICULTY_MIN, DIFFICULTY_MAX],
  );
  const [universe, setUniverse] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const autoRanRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllProblems().then((p) => {
      if (!cancelled) setUniverse(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = useCallback(async () => {
    if (!universe) return;
    setError(null);
    setPending(true);
    try {
      const matches = await collectMatchingProblems({
        subjects,
        tests,
        yearRange,
        diffRange,
        universe,
      });
      if (matches.length === 0) {
        setError("No problems match the current filters.");
        onResult(null);
        return;
      }
      const pick = matches[Math.floor(Math.random() * matches.length)];
      const fetched = await fetchProblemPage(underscores(pick));
      if (!fetched) {
        setError(`The page "${pick}" could not be loaded.`);
        onResult(null);
        return;
      }
      addHistory(pick, fetched.problem);
      increment("numProblems");
      window.history.pushState({}, "", `?page=${underscores(pick)}`);
      onResult({ pagename: pick, ...fetched });
    } finally {
      setPending(false);
    }
  }, [universe, subjects, tests, yearRange, diffRange, onResult]);

  useEffect(() => {
    if (!problems) return;
    if (!preset?.autoRun) return;
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    go();
  }, [problems, preset, go]);

  const cls = `options-input ${hasProblem ? "random-input-active" : ""}`;
  return (
    <div className={cls.trim()} id="random-input">
      <div className="input-container input-flex-full">
        <label className="range-label">Subjects</label>
        <Tagify
          whitelist={SUBJECTS}
          value={subjects}
          onChange={setSubjects}
          placeholder="Choose subjects (optional)"
          useLabels
        />
      </div>
      <div className="input-container input-flex-full">
        <label className="range-label">Tests</label>
        <Tagify
          whitelist={TESTS}
          value={tests}
          onChange={setTests}
          placeholder="Choose tests"
        />
      </div>
      <RangeSlider
        label="Years"
        min={YEAR_MIN}
        max={YEAR_MAX}
        value={yearRange}
        onChange={setYearRange}
      />
      <RangeSlider
        label={
          <>
            Difficulty range
            <sup>
              <a
                className="dark-link"
                id="difficulty-link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDifficultyInfo((v) => !v);
                }}
              >
                (?)
              </a>
            </sup>
          </>
        }
        min={DIFFICULTY_MIN}
        max={DIFFICULTY_MAX}
        step={0.5}
        value={diffRange}
        onChange={setDiffRange}
      />
      <button
        className="input-button input-button-full"
        id="random-button"
        type="button"
        disabled={pending || !universe}
        onClick={go}
      >
        {pending ? "Loading…" : universe ? "Go!" : "Loading problem list…"}
      </button>
      {error && <p className="error">{error}</p>}
      {showDifficultyInfo && (
        <div id="difficulty-info">
          Difficulty levels are based on{" "}
          <a href="https://artofproblemsolving.com/wiki/index.php/AoPS_Wiki:Competition_ratings">
            AoPS Wiki ratings
          </a>
          . They’re just determined by test and problem number, and may be
          inaccurate for old exams.
          <Suspense fallback={<div id="difficulty-chart">Loading chart…</div>}>
            <DifficultyChart />
          </Suspense>
        </div>
      )}
    </div>
  );
}

function SelectTab({ onResult }) {
  const [test, setTest] = useState("AMC 10");
  const [version, setVersion] = useState("A");
  const [year, setYear] = useState(2024);
  const [num, setNum] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const versions = VALID_VERSIONS[test] ?? [];
  const nums = VALID_NUMS[test];

  useEffect(() => {
    if (versions.length && !versions.includes(version)) setVersion(versions[0]);
    if (!versions.length && version) setVersion("");
  }, [test, versions, version]);

  const go = async () => {
    setError(null);
    const yearsKey = `${test}${version || ""}`;
    const validYears = VALID_YEARS[yearsKey];
    if (!validYears || year < validYears.min || year > validYears.max) {
      setError("The given test is not available for that year.");
      onResult(null);
      return;
    }
    if (nums && (num < nums.min || num > nums.max)) {
      setError(
        `Problem number must be between ${nums.min} and ${nums.max} for ${test}.`,
      );
      onResult(null);
      return;
    }
    const fullTest = fullTestName(test, version);
    const pagename = `${year} ${fullTest} Problems/Problem ${num}`;
    setPending(true);
    try {
      const fetched = await fetchProblemPage(underscores(pagename));
      if (!fetched || !fetched.problem) {
        setError(`The page "${pagename}" could not be loaded.`);
        onResult(null);
        return;
      }
      addHistory(pagename, fetched.problem);
      increment("numProblems");
      window.history.pushState(
        {},
        "",
        `?page=${underscores(pagename)}`,
      );
      onResult({ pagename, ...fetched });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="options-input" id="single-input">
      <div className="input-container input-flex-half">
        <label className="range-label">Test</label>
        <select
          className="input-field"
          id="input-singletest"
          value={test}
          onChange={(e) => setTest(e.target.value)}
        >
          {TESTS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="input-container input-flex-half">
        <label className="range-label">Version</label>
        <select
          className="input-field"
          id="input-singlever"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={versions.length === 0}
        >
          {versions.length === 0 && <option value="">(none)</option>}
          {versions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="input-container input-flex-half">
        <label className="range-label" htmlFor="input-singleyear">
          Year
        </label>
        <input
          id="input-singleyear"
          className="input-field"
          type="number"
          min={1974}
          max={YEAR_MAX}
          value={year}
          onChange={(e) => setYear(Number(e.target.value) || 0)}
        />
      </div>
      <div className="input-container input-flex-half">
        <label className="range-label" htmlFor="input-singlenum">
          Problem #
        </label>
        <input
          id="input-singlenum"
          className="input-field"
          type="number"
          min={nums?.min ?? 1}
          max={nums?.max ?? 40}
          value={num}
          onChange={(e) => setNum(Number(e.target.value) || 0)}
        />
      </div>
      <button
        type="button"
        className="input-button input-button-full"
        id="single-button"
        disabled={pending}
        onClick={go}
      >
        {pending ? "Loading…" : "Go!"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function Practice({ preset }) {
  const [tab, setTab] = useState("random");
  const [current, setCurrent] = useState(null);
  const [session, setSession] = useState(EMPTY_SESSION);

  const onResult = (result) => {
    setSession((s) => {
      const next = { ...s, ready: true };
      if (result === "right") {
        next.right = s.right + 1;
        next.streak = s.streak + 1;
        bumpStreakIfLonger(next.streak);
      } else if (result === "retry") {
        next.retry = s.retry + 1;
        next.streak = 0;
      } else if (result === "wrong") {
        next.wrong = s.wrong + 1;
        next.streak = 0;
      } else if (result === "blank") {
        next.blank = s.blank + 1;
        next.streak = 0;
      }
      return next;
    });
  };

  return (
    <>
      <SecondaryNav
        tab={tab}
        onTab={(t) => {
          setTab(t);
          setCurrent(null);
        }}
      />
      {tab === "random" ? (
        <>
          <RandomTab
            preset={preset}
            hasProblem={!!current}
            onResult={setCurrent}
          />
          <SessionProgress {...session} />
        </>
      ) : (
        <SelectTab onResult={setCurrent} />
      )}
      {current && (
        <ProblemDisplay
          pagename={current.pagename}
          problem={current.problem}
          solutions={current.solutions}
          onResult={onResult}
        />
      )}
    </>
  );
}
