// src/App.jsx
import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoadingSplash from "./pages/LoadingSplash";
import LoadingSplashFast from "./pages/LoadingSplashFast";

/* -----------------------------------------------------------
 * lazy() with .preload() so we can fetch bundles ahead of time
 * --------------------------------------------------------- */
function lazyWithPreload(factory) {
  const C = lazy(factory);
  C.preload = factory; // kick off loading without rendering
  return C;
}

/** ---------------------------------------------
 *  Pages (desktop + mobile) as lazy bundles
 *  --------------------------------------------- */
const Home       = lazyWithPreload(() => import("./pages/Home"));
const Tech       = lazyWithPreload(() => import("./pages/Tech"));
const Team       = lazyWithPreload(() => import("./pages/Team"));
const News       = lazyWithPreload(() => import("./pages/News"));

const HomeMobile = lazyWithPreload(() => import("./pages/HomeMobile"));
const TechMobile = lazyWithPreload(() => import("./pages/TechMobile"));
const TeamMobile = lazyWithPreload(() => import("./pages/TeamMobile"));
const NewsMobile = lazyWithPreload(() => import("./pages/NewsMobile"));

/* ---------------------------------------------
 * Media query hook (mobile vs desktop)
 * ------------------------------------------- */
function useMediaQuery(query = "(max-width: 820px)") {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    // Safari <14 support
    try {
      mql.addEventListener("change", onChange);
    } catch {
      mql.addListener(onChange);
    }
    return () => {
      try {
        mql.removeEventListener("change", onChange);
      } catch {
        mql.removeListener(onChange);
      }
    };
  }, [query]);

  return matches;
}

/* ---------------------------------------------
 * Image preloader with a per-URL memoized cache
 * ------------------------------------------- */
const _imgCache = new Set();
function preloadImagesOnce(urls = []) {
  if (!Array.isArray(urls)) urls = [urls];
  const tasks = urls.map((src) => {
    if (!src || _imgCache.has(src)) return Promise.resolve();
    return new Promise((res) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        _imgCache.add(src);
        res();
      };
      img.src = src;
    });
  });
  return Promise.all(tasks);
}

/* ---------------------------------------------
 * Small helper to avoid “forever” hangs
 * ------------------------------------------- */
function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
}

/* ---------------------------------------------
 * Declare per-route assets (images, chunks)
 * ------------------------------------------- */
const PAGE_IMAGES = {
  "/home": [
    new URL("./assets/HomeOneLight.png", import.meta.url).href,
    new URL("./assets/HomeOneDark.png", import.meta.url).href,
    new URL("./assets/HomeTwo.png", import.meta.url).href,
    new URL("./assets/HomeThree.png", import.meta.url).href,
    new URL("./assets/Globe.png", import.meta.url).href,
  ],
  "/tech": [
    new URL("./assets/TechDark.png", import.meta.url).href,
    new URL("./assets/TechOne.png", import.meta.url).href,
    new URL("./assets/TechTwo.png", import.meta.url).href,
  ],
  "/team": [
    new URL("./assets/TableDark.png", import.meta.url).href,
    new URL("./assets/TableBright.png", import.meta.url).href,
    "/Bill.png",
    "/George.jpg",
    "/Jack.jpg",
    "/Jona.png",
    "/Lucas.png",
    "/Mark.png",
    "/Mike.jpg",
    "/Nina.png",
    "/Northwestern.jpg",
    "/Richard.jpg",
    "/UChicago.jpg",
  ],
  "/news": [
    new URL("./assets/NewsDark.png", import.meta.url).href,
    new URL("./assets/NewLight.png", import.meta.url).href,
    "/FirstStep.jpg",
    "/News1.jpg",
    "/News2.jpg",
    "/News3.jpg",
  ],
};

const PAGE_CHUNK_PRELOAD = {
  "/home": () => (Home.preload?.(), HomeMobile.preload?.()),
  "/tech": () => (Tech.preload?.(), TechMobile.preload?.()),
  "/team": () => (Team.preload?.(), TeamMobile.preload?.()),
  "/news": () => (News.preload?.(), NewsMobile.preload?.()),
};

/* ---------------------------------------------
 * Optional: background prefetch graph
 * (home → tech → team → news)
 * ------------------------------------------- */
const PREFETCH_NEXT = {
  "/home": ["/tech"],
  "/tech": ["/team"],
  "/team": ["/news"],
  "/news": [],
};

/* ---------------------------------------------
 * First-visit splash policy
 * ------------------------------------------- */
const FIRST_SPLASH_ROUTES = new Set(["/home", "/tech", "/team", "/news"]);
const FAST_SPLASH_ROUTES  = new Set(["/tech", "/team", "/news"]);
const visitKey = (p) => `visited:${p}`;
const safeGet = (k) => {
  try { return sessionStorage.getItem(k); } catch { return null; }
};
const safeSet = (k, v) => {
  try { sessionStorage.setItem(k, v); } catch {}
};
const hasVisited = (p) => safeGet(visitKey(p)) === "1";
const markVisited = (p) => safeSet(visitKey(p), "1");

/* ---------------------------------------------
 * Initial page gate:
 * - Waits for window.load (if not already fired),
 *   fonts, current route chunk, and current route images.
 * ------------------------------------------- */
function useInitialGate(currentPathname) {
  const [ready, setReady] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const waitWindowLoad = () =>
      new Promise((resolve) => {
        if (typeof window === "undefined") return resolve();
        if (document.readyState === "complete") return resolve();
        window.addEventListener("load", () => resolve(), { once: true });
      });

    const doChunks = PAGE_CHUNK_PRELOAD[currentPathname]?.() ?? Promise.resolve();
    const doImgs = preloadImagesOnce(PAGE_IMAGES[currentPathname] ?? []);
    const doFonts = (typeof document !== "undefined" && document.fonts?.ready) || Promise.resolve();

    withTimeout(Promise.all([Promise.resolve(doChunks), doImgs, doFonts, waitWindowLoad()]))
      .then(() => setReady(true))
      .catch(() => setReady(true)); // fail open on edge cases
  }, [currentPathname]);

  return ready;
}

/* ---------------------------------------------
 * Route-change gate:
 * - Keep rendering the previous route while preloading
 *   the next route’s chunk, images, and fonts.
 * ------------------------------------------- */
function useRouteAssetGate(location) {
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isBlocking, setIsBlocking] = useState(false);

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;

    const target = location.pathname;
    setIsBlocking(true);

    const doChunk = PAGE_CHUNK_PRELOAD[target]?.() ?? Promise.resolve();
    const doImgs  = preloadImagesOnce(PAGE_IMAGES[target] ?? []);
    const doFonts = (typeof document !== "undefined" && document.fonts?.ready) || Promise.resolve();

    withTimeout(Promise.all([Promise.resolve(doChunk), doImgs, doFonts]))
      .then(() => setDisplayLocation(location))
      .finally(() => setIsBlocking(false));
  }, [location, displayLocation.pathname]);

  return { displayLocation, isBlocking };
}

/* ---------------------------------------------
 * App
 * ------------------------------------------- */
export default function App() {
  const isNarrow = useMediaQuery();
  const location = useLocation();

  // 1) Gate the very first paint
  const initialReady = useInitialGate(location.pathname);

  // 2) Gate subsequent route changes
  const { displayLocation, isBlocking } = useRouteAssetGate(location);

  // 3) Background prefetch of “next” routes’ assets
  useEffect(() => {
    const nexts = PREFETCH_NEXT[displayLocation.pathname] || [];
    nexts.forEach((p) => {
      PAGE_CHUNK_PRELOAD[p]?.();
      preloadImagesOnce(PAGE_IMAGES[p] || []);
    });
  }, [displayLocation.pathname]);

  /* ---------------------------------------------
   * New: per-route first-visit splash control
   * - forceSplash keeps the overlay mounted
   *   until the animation calls onDone.
   * ------------------------------------------- */
  const [forceSplash, setForceSplash] = useState(null); // { path, variant: "full"|"fast" } | null

  // On initial mount: if this route hasn't been visited in this tab, force its first-visit splash
  useEffect(() => {
    const p = location.pathname;
    if (FIRST_SPLASH_ROUTES.has(p) && !hasVisited(p)) {
      setForceSplash({ path: p, variant: FAST_SPLASH_ROUTES.has(p) ? "fast" : "full" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On navigation start: if target route is a first visit, force that splash
  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;
    const target = location.pathname;
    if (FIRST_SPLASH_ROUTES.has(target) && !hasVisited(target)) {
      setForceSplash({ path: target, variant: FAST_SPLASH_ROUTES.has(target) ? "fast" : "full" });
    }
  }, [location.pathname, displayLocation.pathname]);

  const handleForcedSplashDone = useCallback(() => {
    const p = forceSplash?.path;
    if (p) {
      markVisited(p);
      setForceSplash(null);
    }
  }, [forceSplash]);

  // Show overlay if:
  // - first paint not ready, OR
  // - route assets are blocking, OR
  // - we are in a forced first-visit splash that must play to completion
  const shouldShowOverlay = (!initialReady) || isBlocking || !!forceSplash;

  // Pick which splash to render:
  // - forced first visit ⇒ use its variant (full/fast)
  // - otherwise fall back to your original full LoadingSplash
  const OverlayComponent = forceSplash
    ? (forceSplash.variant === "fast" ? LoadingSplashFast : LoadingSplash)
    : LoadingSplash;

  return (
    <div className="min-h-dvh">
      {/* Unified splash: honors first-visit variant & only shows when needed */}
      {shouldShowOverlay && (
        <OverlayComponent onDone={forceSplash ? handleForcedSplashDone : undefined} />
      )}

      {/* Keep old route visible until next route is fully ready */}
      <Suspense fallback={null}>
        <Routes location={displayLocation}>
          <Route path="/home" element={isNarrow ? <HomeMobile /> : <Home />} />
          <Route path="/tech" element={isNarrow ? <TechMobile /> : <Tech />} />
          <Route path="/team" element={isNarrow ? <TeamMobile /> : <Team />} />
          <Route path="/news" element={isNarrow ? <NewsMobile /> : <News />} />

          {/* Optional debug/example routes; remove if not needed */}
          <Route path="/test" element={<HomeMobile />} />
          <Route path="/testteam" element={<TeamMobile />} />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
