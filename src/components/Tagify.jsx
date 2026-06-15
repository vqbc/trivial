/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useMemo, useRef } from "react";
import TagifyLib from "@yaireo/tagify";
// tagify.css is @imported at the top of styles.css so its defaults
// load before our .tagify overrides.

function normalizeWhitelist(whitelist) {
  if (!whitelist) return undefined;
  return whitelist.map((opt) =>
    typeof opt === "string" ? { value: opt } : opt,
  );
}

function valuesFromTagify(tagify) {
  return tagify.value.map((v) => v.value);
}

const subjectTagTemplate = function (tagData) {
  const label = tagData.label ?? tagData.value;
  return `<tag title="${tagData.value}" contenteditable="false" spellcheck="false" tabindex="-1" class="tagify__tag" value="${tagData.value}">
    <x title="" class="tagify__tag__removeBtn" role="button" aria-label="remove tag"></x>
    <div><span class="tagify__tag-text">${label}</span></div>
  </tag>`;
};

// React wrapper around @yaireo/tagify. Owns the actual `<input>`
// element via a ref and keeps the tagify instance in sync with React
// state.
//
// Props:
//   value:           string[]                  — current selected values
//   onChange:        (string[]) => void
//   whitelist:       string[] | { value, label }[] — autocomplete pool
//   mode:            "select" | undefined          — single vs multi
//   placeholder:     string
//   dropdownMax:     number                        — dropdown.maxItems
//   dropdownEnabled: number                        — chars before dropdown opens
//                                                   (0 = always; Tagify default 2)
//   useLabels:       bool                          — render `label` on chips
export default function Tagify({
  value,
  onChange,
  whitelist,
  mode,
  placeholder,
  dropdownMax = 100,
  dropdownEnabled = 0,
  useLabels = false,
  className = "",
}) {
  const inputRef = useRef(null);
  const tagifyRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueLockRef = useRef(false);

  // Keep latest onChange in a ref so we don't have to re-init Tagify
  // every time the parent re-renders.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Build the settings object piecewise so we don't pass any `undefined`
  // values to Tagify — that would overwrite its own defaults (notably
  // the `templates.wrapper` template) and crash inside `parseTemplate`.
  const settings = useMemo(() => {
    const s = {
      placeholder,
      originalInputValueFormat: (vals) => vals.map((e) => e.value),
      dropdown: {
        enabled: dropdownEnabled,
        maxItems: dropdownMax,
      },
    };
    if (whitelist) s.whitelist = normalizeWhitelist(whitelist);
    if (mode) s.mode = mode;
    if (useLabels) {
      s.dropdown.mapValueTo = "label";
      s.templates = { tag: subjectTagTemplate };
    }
    return s;
  }, [whitelist, mode, placeholder, dropdownMax, dropdownEnabled, useLabels]);

  // Mount once. Re-mount when settings actually change.
  useEffect(() => {
    const t = new TagifyLib(inputRef.current, settings);
    tagifyRef.current = t;

    const emit = () => {
      if (valueLockRef.current) return;
      onChangeRef.current?.(valuesFromTagify(t));
    };
    t.on("add", emit).on("remove", emit).on("change", emit);

    return () => {
      t.destroy();
      tagifyRef.current = null;
    };
  }, [settings]);

  // Sync incoming value -> Tagify.
  useEffect(() => {
    const t = tagifyRef.current;
    if (!t) return;
    const current = valuesFromTagify(t);
    if (
      current.length === value.length &&
      current.every((v, i) => v === value[i])
    ) {
      return;
    }
    valueLockRef.current = true;
    t.removeAllTags();
    if (value.length) t.addTags(value);
    valueLockRef.current = false;
  }, [value]);

  const base = mode === "select" ? "input-field" : "input-multi input-flex-full";
  const cls = className ? `${base} ${className}` : base;
  return <input ref={inputRef} className={cls} />;
}
