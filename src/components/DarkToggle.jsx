/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useState } from "react";

function labelFor(value) {
  if (value === true) return "Dark theme";
  if (value === false) return "Light theme";
  return "System theme";
}

function readStored() {
  try {
    return JSON.parse(localStorage.getItem("darkTheme"));
  } catch {
    return null;
  }
}

// The choice is remembered when storage allows; the toggle still works
// for this page view when it doesn't.
function store(value) {
  try {
    if (value === null) localStorage.removeItem("darkTheme");
    else localStorage.setItem("darkTheme", JSON.stringify(value));
  } catch {
    // Storage is blocked.
  }
}

function setColorScheme(content) {
  document
    .querySelector("meta[name='color-scheme']")
    .setAttribute("content", content);
}

function setDarkClass(enabled) {
  document.documentElement.classList.toggle("dark", enabled);
}

export default function DarkToggle() {
  // true / false / null (system), kept in state so the toggle still
  // cycles when storage is blocked.
  const [theme, setTheme] = useState(readStored);

  const onClick = () => {
    if (theme === true) {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setDarkClass(systemPrefersDark);
      store(null);
      setColorScheme("light dark");
      setTheme(null);
    } else if (theme === null) {
      setDarkClass(false);
      store(false);
      setColorScheme("light");
      setTheme(false);
    } else {
      setDarkClass(true);
      store(true);
      setColorScheme("dark");
      setTheme(true);
    }
  };

  return (
    <button
      className="text-button"
      id="dark-toggle"
      tabIndex={0}
      onClick={onClick}
    >
      {labelFor(theme)}
    </button>
  );
}
