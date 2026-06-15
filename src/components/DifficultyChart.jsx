/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect, useRef } from "react";
import vegaEmbed from "vega-embed";

const SPEC = {
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  description: "Difficulty range by test",
  data: {
    values: [
      { Test: "AMC 8", "Start difficulty": 0.25, "End difficulty": 2, Level: "Introductory" },
      { Test: "AMC 10", "Start difficulty": 1, "End difficulty": 4.5, Level: "Intermediate" },
      { Test: "AMC 12", "Start difficulty": 1.25, "End difficulty": 5.5, Level: "Intermediate" },
      { Test: "AHSME", "Start difficulty": 1, "End difficulty": 5.5, Level: "Intermediate" },
      { Test: "AIME", "Start difficulty": 3, "End difficulty": 6.5, Level: "Intermediate" },
      { Test: "USAJMO", "Start difficulty": 4, "End difficulty": 7, Level: "Olympiad" },
      { Test: "USAMO", "Start difficulty": 4, "End difficulty": 8.5, Level: "Olympiad" },
      { Test: "IMO", "Start difficulty": 4, "End difficulty": 9.5, Level: "Olympiad" },
    ],
  },
  mark: "bar",
  encoding: {
    y: {
      field: "Test",
      type: "ordinal",
      sort: { order: null },
      axis: { titleFontSize: 14, labelFontSize: 13 },
    },
    x: {
      field: "Start difficulty",
      type: "quantitative",
      axis: {
        tickMinStep: 1,
        titleFontSize: 14,
        labelFontSize: 13,
        title: "Difficulty",
      },
    },
    x2: { field: "End difficulty" },
    color: {
      type: "nominal",
      field: "Level",
      scale: {
        domain: ["Introductory", "Intermediate", "Olympiad"],
        range: ["#f58518", "#4c78a8", "#e45756"],
      },
      sort: { order: null },
      legend: { titleFontSize: 14, labelFontSize: 13 },
    },
  },
  width: "container",
  height: 200,
  background: null,
  config: { font: "'Latin Modern Sans', sans-serif" },
};

export default function DifficultyChart() {
  const ref = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    vegaEmbed(ref.current, SPEC, { actions: false, renderer: "svg" })
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
  }, []);

  return <div id="difficulty-chart" ref={ref} />;
}
