/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Props for a heading that expands or collapses a section on click, so
// it also works from the keyboard (Tab to it, then Enter or Space).
export const toggleProps = (onToggle, expanded) => ({
  role: "button",
  tabIndex: 0,
  "aria-expanded": expanded,
  onClick: onToggle,
  onKeyDown: (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  },
});
