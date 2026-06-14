/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" height="30px" className="button-icon">
      <path
        fill="#FFFFFF"
        d="M17.545,15.467l-3.779-3.779c0.57-0.935,0.898-2.035,0.898-3.21c0-3.417-2.961-6.377-6.378-6.377  C4.869,2.1,2.1,4.87,2.1,8.287c0,3.416,2.961,6.377,6.377,6.377c1.137,0,2.2-0.309,3.115-0.844l3.799,3.801  c0.372,0.371,0.975,0.371,1.346,0l0.943-0.943C18.051,16.307,17.916,15.838,17.545,15.467z M4.004,8.287  c0-2.366,1.917-4.283,4.282-4.283c2.366,0,4.474,2.107,4.474,4.474c0,2.365-1.918,4.283-4.283,4.283  C6.111,12.76,4.004,10.652,4.004,8.287z"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" height="30px" className="button-icon">
      <path
        fill="#FFFFFF"
        d="M11,1.799c-4.445,0-8.061,3.562-8.169,7.996V10H0.459l3.594,3.894L7.547,10H4.875V9.795  C4.982,6.492,7.683,3.85,11,3.85c3.386,0,6.131,2.754,6.131,6.15S14.386,16.15,11,16.15c-1.357,0-2.611-0.445-3.627-1.193  l-1.406,1.504c1.388,1.088,3.135,1.738,5.033,1.738c4.515,0,8.174-3.67,8.174-8.199S15.515,1.799,11,1.799z M10,5v5  c0,0.13,0.027,0.26,0.077,0.382c0.051,0.122,0.124,0.233,0.216,0.325l3.2,3.2c0.283-0.183,0.55-0.389,0.787-0.628L12,11V5H10z"
      />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 20 20" height="30px" className="button-icon">
      <path
        fill="#FFFFFF"
        d="M0.69,11.331l1.363,0.338l1.026-1.611l-1.95-0.482c-0.488-0.121-0.981,0.174-1.102,0.66  C-0.094,10.719,0.202,11.209,0.69,11.331z M18.481,11.592l-4.463,4.016l-5.247-4.061c-0.1-0.076-0.215-0.133-0.338-0.162  l-0.698-0.174l-1.027,1.611l1.1,0.273l5.697,4.408c0.166,0.127,0.362,0.189,0.559,0.189c0.219,0,0.438-0.078,0.609-0.232  l5.028-4.527c0.372-0.334,0.401-0.906,0.064-1.277C19.428,11.286,18.854,11.256,18.481,11.592z M8.684,7.18l4.887,3.129  c0.413,0.264,0.961,0.154,1.24-0.246l5.027-7.242c0.286-0.412,0.183-0.977-0.231-1.26c-0.414-0.285-0.979-0.182-1.265,0.23  l-4.528,6.521L8.898,5.165C8.694,5.034,8.447,4.991,8.21,5.042c-0.236,0.053-0.442,0.197-0.571,0.4L0.142,17.209  c-0.27,0.422-0.144,0.983,0.28,1.25c0.15,0.096,0.319,0.141,0.486,0.141c0.301,0,0.596-0.149,0.768-0.42L8.684,7.18z"
      />
    </svg>
  );
}

function MainButton({ id, label, icon, wide, activeView, view, onClick }) {
  const active = activeView === view;
  const cls =
    "button " +
    (wide ? "wide-button " : "") +
    (active ? "button-active" : "");
  return (
    <button type="button" className={cls.trim()} id={id} onClick={onClick}>
      {icon}
      {wide ? label : <span className="button-text">{label}</span>}
    </button>
  );
}

export default function Home({ activeView, onNavigate }) {
  return (
    <>
      <p className="intro-header">
        Click on any of the buttons below for endless practice and problem
        sets!
      </p>
      <div className="shortcut-container">
        <div className="shortcut-text">Popular!</div>
        <button
          className="shortcut-button"
          onClick={() =>
            onNavigate("practice", {
              tests: ["AIME"],
              diffRange: [3, 6.5],
              autoRun: true,
            })
          }
        >
          AIME Training
        </button>
        <button
          className="shortcut-button"
          onClick={() =>
            onNavigate("sets", {
              tab: "random",
              tests: ["AIME"],
              diffRange: [3, 6.5],
              number: 15,
              autoRun: true,
            })
          }
        >
          AIME Mocks
        </button>
      </div>
      <div className="button-container" id="main-button-container">
        <MainButton
          id="single-problem"
          label="Practice Mode"
          wide
          view="practice"
          activeView={activeView}
          onClick={() => onNavigate("practice", { autoRun: true })}
        />
        <MainButton
          id="problem-batch"
          label="Problem Sets"
          wide
          view="sets"
          activeView={activeView}
          onClick={() => onNavigate("sets", { autoRun: true })}
        />
        <MainButton
          id="search-nav"
          label="Search"
          icon={<SearchIcon />}
          view="search"
          activeView={activeView}
          onClick={() => onNavigate("search")}
        />
        <MainButton
          id="history-button"
          label="History"
          icon={<HistoryIcon />}
          view="history"
          activeView={activeView}
          onClick={() => onNavigate("history")}
        />
        <MainButton
          id="stats-button"
          label="Stats"
          icon={<StatsIcon />}
          view="stats"
          activeView={activeView}
          onClick={() => onNavigate("stats")}
        />
      </div>
    </>
  );
}
