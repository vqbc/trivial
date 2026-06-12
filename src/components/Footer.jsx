/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import DarkToggle from "./DarkToggle.jsx";

export default function Footer() {
  return (
    <footer>
      <p className="footer-line disclaimer printonly">
        Using content from the{" "}
        <a
          id="aops-wiki-link"
          href="https://artofproblemsolving.com/wiki/index.php/"
        >
          AoPS Wiki
        </a>{" "}
        | <a href="https://amctrivial.com/">amctrivial.com</a>
      </p>
      <p className="footer-line siteinfo noprint">
        <DarkToggle /> | <a href="/about">About</a>
        <span className="bullet"> ⋅ </span>
        <span className="mobile-break">
          <br />
        </span>
        <a href="https://github.com/vqbc/trivial">Github</a> ⋅{" "}
        <a href="https://discord.gg/VExpSZfkAE">Discord</a> ⋅{" "}
        <a href="https://forms.gle/3ofW7BQ5g5UBmknH9">Contact</a>
        <br />
        Made by <a href="https://vqbc.github.io">Andi Chang</a>
      </p>
    </footer>
  );
}
