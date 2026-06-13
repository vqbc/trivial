/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import {
  SUBJECTS,
  TESTS,
  TEST_WHITELIST,
  VALID_VERSIONS,
  VALID_YEARS,
  YEAR_MIN,
  YEAR_MAX,
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
} from "../lib/constants.js";
import { fullTestName, titleCleanup, underscores } from "../lib/problems.js";
import {
  collectMatchingProblems,
  fetchAllProblems,
  fetchProblemBatch,
} from "../lib/aops.js";
import { addHistoryBatch } from "../lib/history.js";
import { increment } from "../lib/stats.js";
import RangeSlider from "./RangeSlider.jsx";
import Tagify from "./Tagify.jsx";
import BatchDisplay from "./BatchDisplay.jsx";
import MoreOptions, { DEFAULT_MORE_OPTIONS } from "./MoreOptions.jsx";

function SecondaryNav({ tab, onTab }) {
  const cls = (id) =>
    `button secondary-button ${tab === id ? "secondary-button-active" : ""}`;
  return (
    <div className="button-container" id="secondary-button-container">
      <button
        type="button"
        className={cls("random")}
        onClick={() => onTab("random")}
      >
        Random
      </button>
      <button
        type="button"
        className={cls("past")}
        onClick={() => onTab("past")}
      >
        Past Test
      </button>
      <button
        type="button"
        className={`${cls("custom")} button-flex-full`}
        onClick={() => onTab("custom")}
      >
        Custom
      </button>
      <div className="secondary-spacer" />
    </div>
  );
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
            width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
          }}
        />
      </div>
    </div>
  );
}

// Converts cleaned titles ("2024 AMC 10A #1") back to wiki form
// ("2024 AMC 10A Problems/Problem 1"), then trims whitespace.
function expandCleanedTitle(s) {
  return s.trim().replace("#", "Problems/Problem ");
}

function RandomBatchTab({ preset, options, onOptions, onRun }) {
  const [subjects, setSubjects] = useState(preset?.subjects ?? []);
  const [tests, setTests] = useState(preset?.tests ?? []);
  const [yearRange, setYearRange] = useState(
    preset?.yearRange ?? [2010, YEAR_MAX - 2],
  );
  const [diffRange, setDiffRange] = useState(
    preset?.diffRange ?? [DIFFICULTY_MIN, DIFFICULTY_MAX],
  );
  const [number, setNumber] = useState(preset?.number ?? 5);
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

  const problemWhitelist = useMemo(
    () => (universe ? universe.map(titleCleanup) : []),
    [universe],
  );

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

      const includeFull = options.include.map(expandCleanedTitle);
      const skipFull = new Set(options.skip.map(expandCleanedTitle));

      if (matches.length === 0 && includeFull.length === 0) {
        setError("No problems match the current filters.");
        return;
      }

      const skipped = new Set(skipFull);
      const seen = new Set();

      const picks = [];
      for (const t of includeFull) {
        if (seen.has(t)) continue;
        seen.add(t);
        picks.push(t);
      }

      const pool = matches.filter((m) => !skipped.has(m) && !seen.has(m));
      const want = Math.min(number, picks.length + pool.length);
      while (picks.length < want && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        picks.push(pool[idx]);
        pool.splice(idx, 1);
      }

      onRun({
        titles: picks.map(underscores),
        pool: pool.map(underscores),
        defaultTitle: `Random Set - ${new Date().toLocaleString("en-UK", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}`,
      });
    } finally {
      setPending(false);
    }
  }, [universe, subjects, tests, yearRange, diffRange, number, options, onRun]);

  useEffect(() => {
    if (!universe) return;
    if (!preset?.autoRun) return;
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    go();
  }, [universe, preset, go]);

  return (
    <>
      <div className="options-input" id="ranbatch-input">
        <Tagify
          whitelist={SUBJECTS}
          value={subjects}
          onChange={setSubjects}
          placeholder="Choose subjects"
          useLabels
        />
        <Tagify
          whitelist={TEST_WHITELIST}
          value={tests}
          onChange={setTests}
          placeholder="Choose tests"
        />
        <RangeSlider
          label="Years"
          min={YEAR_MIN}
          max={YEAR_MAX}
          value={yearRange}
          onChange={setYearRange}
        />
        <RangeSlider
          label="Difficulty range"
          min={DIFFICULTY_MIN}
          max={DIFFICULTY_MAX}
          step={0.5}
          value={diffRange}
          onChange={setDiffRange}
        />
        <div className="input-container input-flex-full">
          <label className="range-label" htmlFor="input-number">
            # of problems
          </label>
          <input
            id="input-number"
            className="input-field"
            type="number"
            min={1}
            max={40}
            value={number}
            onChange={(e) => setNumber(Number(e.target.value) || 0)}
          />
        </div>
        <button
          type="button"
          className="input-button input-button-full"
          id="ranbatch-button"
          disabled={!universe || pending}
          onClick={go}
        >
          {pending ? "Loading…" : universe ? "Go!" : "Loading problem list…"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      <MoreOptions
        value={options}
        onChange={onOptions}
        showIncludeSkip
        problemWhitelist={problemWhitelist}
      />
    </>
  );
}

function PastTestTab({ options, onOptions, onRun }) {
  const [test, setTest] = useState("AMC 10");
  const [version, setVersion] = useState("A");
  const [year, setYear] = useState(2024);
  const [error, setError] = useState(null);
  const [problemsList, setProblemsList] = useState(null);

  useEffect(() => {
    fetchAllProblems().then(setProblemsList);
  }, []);

  const versions = VALID_VERSIONS[test] ?? [];

  useEffect(() => {
    if (versions.length && !versions.includes(version)) setVersion(versions[0]);
    if (!versions.length && version) setVersion("");
  }, [test, versions, version]);

  const go = () => {
    setError(null);
    const fullTest = fullTestName(test, version);
    const key = `${test}${version || ""}`;
    const valid = VALID_YEARS[key];
    if (!valid || year < valid.min || year > valid.max) {
      setError("The given test is not available for that year.");
      return;
    }
    const prefix = `${year} ${fullTest} Problems/Problem `;
    const titles = (problemsList ?? []).filter((t) => t.startsWith(prefix));
    if (titles.length === 0) {
      setError(`No problems found for "${year} ${fullTest}".`);
      return;
    }
    onRun({
      titles: titles.map(underscores),
      defaultTitle: `${year} ${fullTest}`,
      testName: fullTest,
      testYear: String(year),
    });
  };

  return (
    <>
      <div className="options-input" id="batch-input">
        <Tagify
          mode="select"
          whitelist={TESTS}
          value={test ? [test] : []}
          onChange={(arr) => setTest(arr[0] ?? "")}
          placeholder="Test"
          className="input-flex-half"
        />
        <Tagify
          mode="select"
          whitelist={versions}
          value={version ? [version] : []}
          onChange={(arr) => setVersion(arr[0] ?? "")}
          placeholder="Version"
          className="input-flex-half"
        />
        <input
          id="input-singleyear"
          className="input-field"
          type="number"
          min={1974}
          max={YEAR_MAX}
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value) || 0)}
        />
        <button
          type="button"
          className="input-button input-button-full"
          id="batch-button"
          disabled={!problemsList}
          onClick={go}
        >
          {problemsList ? "Go!" : "Loading problem list…"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      <MoreOptions value={options} onChange={onOptions} showSort={false} />
    </>
  );
}

function CustomTab({ options, onOptions, onRun }) {
  const [input, setInput] = useState("");

  const go = () => {
    const titles = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace("#", "Problems/Problem "))
      .map(underscores);
    if (titles.length === 0) return;
    onRun({
      titles,
      defaultTitle: `Custom Set - ${new Date().toLocaleString("en-UK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}`,
    });
  };

  return (
    <>
      <div className="options-input" id="problems-input">
        <div className="input-container input-flex-full">
          <label className="range-label" htmlFor="input-problems">
            Problems (comma-separated, e.g. <code>2024 AMC 10A #1, 2024 AMC 10A #2</code>)
          </label>
          <input
            id="input-problems"
            className="input-field"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste problem list here"
          />
        </div>
        <button
          type="button"
          className="input-button input-button-full"
          id="problems-button"
          onClick={go}
        >
          Go!
        </button>
      </div>
      <MoreOptions value={options} onChange={onOptions} />
    </>
  );
}

export default function Sets({ preset }) {
  const [tab, setTab] = useState(preset?.tab ?? "random");
  const [options, setOptions] = useState(DEFAULT_MORE_OPTIONS);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(
    async ({ titles, pool, defaultTitle, testName, testYear }) => {
      setError(null);
      setBatch(null);
      setPending(true);
      setProgress({ done: 0, total: titles.length });
      try {
        let problems = await fetchProblemBatch(titles, {
          onProgress: (done, total) => setProgress({ done, total }),
        });
        if (problems.length === 0) {
          setError("No problems could be loaded for that set.");
          return;
        }
        if (options.sort) {
          problems = [...problems].sort((a, b) => a.difficulty - b.difficulty);
        }
        const title = options.title.trim() || defaultTitle;
        addHistoryBatch(
          problems.map((p) => p.title),
          problems[0].problem,
          title,
        );
        increment("numSets");
        const problemsParam = problems
          .map((p) => underscores(p.title))
          .join("|");
        const url =
          `?problems=${problemsParam}` +
          (testName && testYear
            ? `&testyear=${encodeURIComponent(testYear)}&testname=${encodeURIComponent(testName)}`
            : "");
        window.history.pushState({}, "", url);
        setBatch({
          title,
          problems,
          pool: pool ?? null,
          breakEvery: options.breakEvery,
          hideSource: options.hideSource,
          testName: testName ?? null,
          testYear: testYear ?? null,
        });
      } finally {
        setPending(false);
      }
    },
    [options],
  );

  const poolRef = useRef([]);
  useEffect(() => {
    poolRef.current = batch?.pool ?? [];
  }, [batch?.pool]);

  const replaceProblem = useCallback(async (index) => {
    while (poolRef.current.length > 0) {
      const i = Math.floor(Math.random() * poolRef.current.length);
      const pick = poolRef.current[i];
      poolRef.current = [
        ...poolRef.current.slice(0, i),
        ...poolRef.current.slice(i + 1),
      ];
      const fetched = await fetchProblemBatch([pick]);
      if (fetched.length > 0) {
        const replacement = fetched[0];
        setBatch((current) => {
          if (!current) return current;
          const nextProblems = [...current.problems];
          nextProblems[index] = replacement;
          return { ...current, problems: nextProblems, pool: poolRef.current };
        });
        return;
      }
    }
  }, []);

  const onTab = (t) => {
    setTab(t);
    setBatch(null);
    setError(null);
  };

  return (
    <>
      <SecondaryNav tab={tab} onTab={onTab} />
      {tab === "random" && (
        <RandomBatchTab
          preset={preset}
          options={options}
          onOptions={setOptions}
          onRun={run}
        />
      )}
      {tab === "past" && (
        <PastTestTab
          options={options}
          onOptions={setOptions}
          onRun={run}
        />
      )}
      {tab === "custom" && (
        <CustomTab
          options={options}
          onOptions={setOptions}
          onRun={run}
        />
      )}
      {error && <p className="error">{error}</p>}
      {pending && <LoadingBar progress={progress} />}
      {batch && (
        <BatchDisplay
          title={batch.title}
          problems={batch.problems}
          breakEvery={batch.breakEvery}
          hideSource={batch.hideSource}
          onReplace={batch.pool ? replaceProblem : null}
          testName={batch.testName}
          testYear={batch.testYear}
        />
      )}
    </>
  );
}
