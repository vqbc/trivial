/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export default function Header() {
  return (
    <header>
      <h1 className="header">
        <a href="/">Trivial.</a>{" "}
        <svg width="15" height="30" viewBox="0 0 132.29 264.58" className="logo">
          <title>
            The Trivial logo is supposed to be a QED symbol (□) — the name
            Trivial represents the general and time-saving solution to any
            mathematical question, as well as how this site was (not) trivial
            to make.
          </title>
          <path
            d="M 34.396002,2.1733e-6 V 264.58 L 0,227.522 V 24.022002 Z"
            fill="#4499aa"
          />
          <path
            d="M 132.296,40.179 50.274971,0 V 264.58 L 132.296,202.596 Z"
            fill="#44bbaa"
          />
        </svg>
      </h1>
      <p className="subtitle">Studying & Practicing — AoPS Wiki Powered</p>
    </header>
  );
}
