/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useState } from "react";
import Tagify from "./Tagify.jsx";

// Collapsible options panel for Sets-style batches. The shape of
// `value` matches the legacy More Options fields:
//   { title, breakEvery, sort, hideSource, include, skip }
// Include/skip are arrays of cleaned problem titles (e.g. "2024 AMC 10A #1").
export default function MoreOptions({
  value,
  onChange,
  showSort = true,
  showIncludeSkip = false,
  problemWhitelist,
}) {
  const [open, setOpen] = useState(false);

  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className={`options-container ${open ? "" : "text-collapsed"}`}>
      <h3
        className="text-collapse-header"
        id="options-header"
        onClick={() => setOpen((v) => !v)}
      >
        More Options
      </h3>
      <div className="options-input" id="more-options">
        <input
          className="input-field"
          id="input-name"
          type="text"
          placeholder="Custom title"
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
        />
        <input
          className="input-field"
          id="input-break"
          type="number"
          min={1}
          max={40}
          placeholder="Page break every n problems"
          value={value.breakEvery ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            set({ breakEvery: Number.isFinite(n) && n > 0 ? n : null });
          }}
        />
        <div className="input-container checkbox-container input-flex-full">
          {showSort && (
            <div className="checkbox-wrap" id="sort-container">
              <input
                type="checkbox"
                className="input-check"
                id="input-sort"
                checked={value.sort}
                onChange={(e) => set({ sort: e.target.checked })}
              />{" "}
              <label className="checkbox-label" htmlFor="input-sort">
                Sort by difficulty
              </label>
            </div>
          )}
          <div className="checkbox-wrap">
            <input
              type="checkbox"
              className="input-check"
              id="input-hide"
              checked={value.hideSource}
              onChange={(e) => set({ hideSource: e.target.checked })}
            />{" "}
            <label className="checkbox-label" htmlFor="input-hide">
              Hide question sources
            </label>
          </div>
        </div>
        {showIncludeSkip && (
          <>
            <Tagify
              value={value.include}
              onChange={(arr) => set({ include: arr })}
              whitelist={problemWhitelist ?? []}
              placeholder="Problems to always include (e.g. 2024 AMC 10A #1)"
              dropdownMax={20}
              dropdownEnabled={2}
            />
            <Tagify
              value={value.skip}
              onChange={(arr) => set({ skip: arr })}
              whitelist={problemWhitelist ?? []}
              placeholder="Problems to exclude"
              dropdownMax={20}
              dropdownEnabled={2}
            />
          </>
        )}
      </div>
    </div>
  );
}

export const DEFAULT_MORE_OPTIONS = {
  title: "",
  breakEvery: null,
  sort: true,
  hideSource: false,
  include: [],
  skip: [],
};
