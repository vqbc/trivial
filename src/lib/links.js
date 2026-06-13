/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect } from "react";

const AOPS_ORIGIN = "https://artofproblemsolving.com";

// Rewrites AoPS-wiki anchor hrefs in a fetched HTML fragment so they
// route through the SPA instead of doing a full navigation. Mirrors
// the legacy `fixLinks`: /wiki/index.php/Foo → ?page=Foo, any other
// /wiki/index.php… link (e.g. ?action=edit) gets prefixed with the
// AoPS origin, and image links get their href stripped so they don't
// navigate at all.
export function rewriteWikiLinks(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  for (const a of div.querySelectorAll("a")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    if (/^\/wiki\/index\.php\//.test(href)) {
      a.setAttribute("href", href.replace("/wiki/index.php/", "?page="));
      a.removeAttribute("title");
    } else if (/^\/wiki\/index\.php/.test(href)) {
      a.setAttribute("href", `${AOPS_ORIGIN}${href}`);
      a.removeAttribute("title");
    }
  }
  for (const a of div.querySelectorAll("a.image")) a.removeAttribute("href");
  return div.innerHTML;
}

// Decode a `?page=Foo_Bar` href back into the page name "Foo Bar".
// Matches the legacy URL→pagename round-trip (preserves "/" by
// double-encoding "%2F" before decoding the rest).
export function pagenameFromPageHref(href) {
  const raw = href.replace(/^\?page=/, "").split("#")[0];
  const safe = raw.replace(/%/g, "%25").replace(/%252F/g, "%2F");
  return decodeURIComponent(safe).replace(/_/g, " ");
}

// Intercept clicks on `?page=…` links inside a rendered article or
// problem body and route them through onNavigate. If onNavigate is
// absent the link falls through to a normal browser navigation,
// which works fine because App's URL router picks the new page up on
// the next load.
export function useWikiLinkClicks(ref, onNavigate) {
  useEffect(() => {
    if (!onNavigate) return;
    const el = ref.current;
    if (!el) return;
    const handler = (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = e.target.closest("a");
      if (!a || !el.contains(a)) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("?page=")) return;
      e.preventDefault();
      onNavigate(pagenameFromPageHref(href));
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [ref, onNavigate]);
}
