// src/App.jsx
import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoadingSplash from "./pages/LoadingSplash";
import Footer from "./components/Footer";

// Helper: lazy() with an exposed .preload()
function lazyWithPreload(factory) {
  const C = lazy(factory);
  C.preload = factory; // call to start fetching early
  return C;
}

// Lazily-loaded pages
const Home = lazyWithPreload(() => import("./pages/Home"));
const Tech = lazyWithPreload(() => import("./pages/Tech"));
const News = lazyWithPreload(() => import("./pages/News"));
const Team = lazyWithPreload(() => import("./pages/Team"));
const Temporary = lazyWithPreload(() => import("./pages/Temporary"));

// Mounts only after Suspense resolves; signals that routes are ready
function MarkRoutesReady({ onReady }) {
  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  // Show splash only if not seen this session
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem("splashSeen") !== "1";
    } catch {
      return true;
    }
  });

  // Track the two gates: splash animation + initial route load
  const [animDone, setAnimDone] = useState(false);
  const [routesReady, setRoutesReady] = useState(false);

  // Preload the other routes while the splash is up
  useEffect(() => {
    if (showSplash) {
      Home.preload?.();
      Tech.preload?.();
      News.preload?.();
      Team.preload?.();
      Temporary.preload?.();
    }
  }, [showSplash]);

  // Hide splash only after BOTH animation finished and routes are ready
  useEffect(() => {
    if (showSplash && animDone && routesReady) {
      setShowSplash(false);
      try {
        sessionStorage.setItem("splashSeen", "1");
      } catch {}
    }
  }, [showSplash, animDone, routesReady]);

  return (
    <div className="min-h-dvh bg-brand-dark text-white">
      {/* Keep using your state-driven splash. It calls onDone when the animation finishes. */}
      {showSplash && <LoadingSplash onDone={() => setAnimDone(true)} />}

      {/* Suspense ensures content isn't shown until the route chunk is loaded */}
      <Suspense fallback={null}>
        {!routesReady && <MarkRoutesReady onReady={() => setRoutesReady(true)} />}

        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/tech" element={<Tech />} />
          <Route path="/team" element={<Team />} />
          <Route path="/news" element={<News />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>

      </Suspense>
    </div>
  );
}