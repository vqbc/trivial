/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useState } from "react";
import { clearHistory, readHistory } from "../lib/history.js";

const PAGE_SIZE = 10;

function HistoryItem({ item }) {
  return (
    <div className="result-item">
      <h2 className="result-title">
        <a className="result-link" href={item.url}>
          {item.title}
        </a>
      </h2>
      <p
        className="result-snippet"
        dangerouslySetInnerHTML={{ __html: `${item.snippet}...` }}
      />
    </div>
  );
}

export default function History() {
  const [items, setItems] = useState(() => readHistory());
  const [shown, setShown] = useState(() => Math.min(PAGE_SIZE, items.length));

  useEffect(() => {
    document.title = "View history - Trivial Math Practice";
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, []);

  const onClear = () => {
    clearHistory();
    setItems([]);
    setShown(0);
  };

  if (items.length === 0) {
    return (
      <div className="results-container">
        <div className="results-notice">No history yet…</div>
      </div>
    );
  }

  return (
    <>
      <div className="results-container">
        <button
          type="button"
          className="text-button"
          id="clear-history"
          onClick={onClear}
        >
          (Clear history)
        </button>
        {items.slice(0, shown).map((item) => (
          <HistoryItem key={item.url} item={item} />
        ))}
      </div>
      {shown < items.length && (
        <button
          type="button"
          className="text-button"
          id="load-results"
          onClick={() => setShown((s) => Math.min(s + PAGE_SIZE, items.length))}
        >
          Load more…
        </button>
      )}
    </>
  );
}
