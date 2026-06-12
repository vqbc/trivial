/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Suspense, lazy, useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./components/Home.jsx";
import Practice from "./components/Practice.jsx";
import Sets from "./components/Sets.jsx";
import Search from "./components/Search.jsx";
import ArticleView from "./components/ArticleView.jsx";
import BatchView from "./components/BatchView.jsx";
import History from "./components/History.jsx";
import About from "./components/About.jsx";

const Stats = lazy(() => import("./components/Stats.jsx"));

function readViewFromUrl() {
  if (/^\/about\/?$/.test(window.location.pathname)) return "about";
  const params = new URLSearchParams(window.location.search);
  if (params.get("page")) return "article";
  if (params.get("problems")) return "batch";
  const hash = window.location.hash.replace(/^#/, "");
  if (
    hash === "practice" ||
    hash === "sets" ||
    hash === "search" ||
    hash === "history" ||
    hash === "stats"
  )
    return hash;
  return "home";
}

export default function App() {
  const [view, setView] = useState(readViewFromUrl);
  const [preset, setPreset] = useState(null);

  useEffect(() => {
    const onPop = () => {
      setView(readViewFromUrl());
      setPreset(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next, opts = null) => {
    setPreset(opts);
    if (next === "home") {
      window.history.pushState({}, "", "/");
    } else {
      window.history.pushState({ view: next }, "", `#${next}`);
    }
    setView(next);
  };

  return (
    <>
      <Header />
      <main>
        {view !== "about" && (
          <Home activeView={view} onNavigate={navigate} />
        )}
        {view === "practice" && <Practice preset={preset} />}
        {view === "sets" && <Sets preset={preset} />}
        {view === "search" && <Search />}
        {view === "article" && <ArticleView />}
        {view === "batch" && <BatchView />}
        {view === "history" && <History />}
        {view === "stats" && (
          <Suspense
            fallback={<p className="intro-header">Loading stats…</p>}
          >
            <Stats />
          </Suspense>
        )}
        {view === "about" && <About />}
      </main>
      <Footer />
    </>
  );
}
