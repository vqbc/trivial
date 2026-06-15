/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Suspense, lazy } from "react";

const DifficultyChart = lazy(() => import("./DifficultyChart.jsx"));

export function DifficultyHelpLink({ onClick }) {
  return (
    <sup>
      <a
        className="dark-link"
        id="difficulty-link"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        (?)
      </a>
    </sup>
  );
}

export function DifficultyInfoPanel() {
  return (
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
  );
}
