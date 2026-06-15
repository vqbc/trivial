/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// tagify.css is @imported from styles.css so it loads before our
// overrides without depending on Vite's bundle-ordering heuristics.
import "./styles.css";
import "./dark.css";
import App from "./App.jsx";
import { rollTodayIfNeeded } from "./lib/stats.js";

rollTodayIfNeeded();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
