/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function Bar({ kind, count, label }) {
  return (
    <div
      className={`question-bar ${kind} ${count === 0 ? "bar-hidden" : ""}`}
      style={{ flexGrow: count }}
    >
      {count} {label}
    </div>
  );
}

export default function SessionProgress({
  streak,
  right,
  retry,
  blank,
  wrong,
  ready,
}) {
  const cls = `practice-progress progress-nobottom ${
    ready ? "" : "progress-hidden"
  }`;
  return (
    <div className={cls.trim()}>
      <div className={`streak-bar ${ready ? "" : "bar-hidden"}`}>
        <span>{streak}</span> streak
      </div>
      <Bar kind="right-questions" count={right} label="correct" />
      <Bar kind="retry-questions" count={retry} label="retry" />
      <div className="spacer-bar" style={{ flexGrow: 0 }} />
      <Bar kind="blank-questions" count={blank} label="blank" />
      <Bar kind="wrong-questions" count={wrong} label="incorrect" />
    </div>
  );
}
