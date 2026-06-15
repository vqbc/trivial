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
  return JSON.parse(localStorage.getItem("darkTheme"));
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
  const [label, setLabel] = useState(() => labelFor(readStored()));

  const onClick = () => {
    const current = readStored();
    if (current === true) {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setDarkClass(systemPrefersDark);
      localStorage.removeItem("darkTheme");
      setColorScheme("light dark");
      setLabel("System theme");
    } else if (current === null) {
      setDarkClass(false);
      localStorage.setItem("darkTheme", "false");
      setColorScheme("light");
      setLabel("Light theme");
    } else {
      setDarkClass(true);
      localStorage.setItem("darkTheme", "true");
      setColorScheme("dark");
      setLabel("Dark theme");
    }
  };

  return (
    <button
      className="text-button"
      id="dark-toggle"
      tabIndex={0}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
