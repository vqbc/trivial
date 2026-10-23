/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Shared by the app and scripts/snapshot.js: where a wiki page lives in the
// static snapshot (public/data/wiki/). Titles are normalized the way
// MediaWiki does (underscores = spaces, first letter uppercase) and then
// hashed (cyrb53) so any title becomes a safe, short file name.
export function normalizeTitle(title) {
  const t = title.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function wikiPath(title) {
  const str = normalizeTitle(title);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const key = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).padStart(11, "0");
  return `${key.slice(0, 2)}/${key.slice(2)}.json`;
}
