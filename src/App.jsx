import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoadingSplash from "./pages/LoadingSplash";
import LoadingSplashOriginal from "./pages/LoadingSplashOriginal";

/* Lazy-load all routes (desktop + mobile) */
const Home = lazy(() => import("./pages/Home"));
const Tech = lazy(() => import("./pages/Tech"));
const Team = lazy(() => import("./pages/Team"));
const News = lazy(() => import("./pages/News"));
const HomeMobile = lazy(() => import("./pages/HomeMobile"));
const TechMobile = lazy(() => import("./pages/TechMobile"));
const TeamMobile = lazy(() => import("./pages/TeamMobile"));
const NewsMobile = lazy(() => import("./pages/NewsMobile"));
const Test = lazy(() => import("./pages/Test"));

/* Helper: preload images */
function preloadImages(urls = []) {
  return Promise.all(
    urls.map(
      (src) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = img.onerror = () => res();
          img.src = src;
        })
    )
  );
}

/* Responsive breakpoint */
function useMediaQuery(query = "(max-width: 820px)") {
  const [matches, setMatches] = useState(
    typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [query]);
  return matches;
}

export default function App() {
  const isMobile = useMediaQuery();
  const location = useLocation();
  const isTestRoute = location.pathname === "/test";

  // One shared session flag for BOTH splashes
  const SPLASH_SESSION_KEY = "splashDoneThisSession";

  // Single source of truth: if true, neither splash should show
  const [splashDone, setSplashDone] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [assetsReady, setAssetsReady] = useState(false);

  /* -----------------------------------------
   * Preload all pages + images during splash
   * ----------------------------------------- */
  useEffect(() => {
    async function preloadAll() {
      try {
        await Promise.all([
          import("./pages/Home"),
          import("./pages/Tech"),
          import("./pages/Team"),
          import("./pages/News"),
          import("./pages/HomeMobile"),
          import("./pages/TechMobile"),
          import("./pages/TeamMobile"),
          import("./pages/NewsMobile"),
          preloadImages([
            new URL("./assets/HomeOneLight.png", import.meta.url).href,
            new URL("./assets/HomeOneDark.png", import.meta.url).href,
            new URL("./assets/HomeTwo.png", import.meta.url).href,
            new URL("./assets/HomeThree.png", import.meta.url).href,
            new URL("./assets/Globe.png", import.meta.url).href,
            new URL("./assets/TechDark.png", import.meta.url).href,
            new URL("./assets/TechOne.png", import.meta.url).href,
            new URL("./assets/TechTwo.png", import.meta.url).href,
            new URL("./assets/TableDark.png", import.meta.url).href,
            new URL("./assets/TableBright.png", import.meta.url).href,
            new URL("./assets/NewsDark.png", import.meta.url).href,
            new URL("./assets/NewLight.png", import.meta.url).href,
          ]),
        ]);
      } catch {
        /* ignore preload errors */
      } finally {
        setAssetsReady(true);
      }
    }
    preloadAll();
  }, []);

  /* -----------------------------------------
   * Shared "done" handler (either splash sets the same key)
   * ----------------------------------------- */
  const markSplashDone = () => {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
    } catch {}
    setSplashDone(true);
  };

  /* -----------------------------------------
   * Render: app is always behind splash
   * ----------------------------------------- */
  const shouldShowTestSplash = isTestRoute && !splashDone;
  const shouldShowMainSplash = !isTestRoute && !splashDone;

  return (
    <div className="relative min-h-dvh bg-[#0a0d0f] text-white">
      {/* The real app — always rendered behind the splash */}
      <Suspense fallback={null}>
        <Routes location={location}>
          <Route path="/home" element={isMobile ? <HomeMobile /> : <Home />} />
          <Route path="/tech" element={isMobile ? <TechMobile /> : <Tech />} />
          <Route path="/team" element={isMobile ? <TeamMobile /> : <Team />} />
          <Route path="/news" element={isMobile ? <NewsMobile /> : <News />} />
          <Route path="/test" element={isMobile ? <Test /> : <Test />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>

      {/* /test: run LoadingSplash once per session (shared) */}
      {shouldShowTestSplash && (
        <div className="fixed inset-0 z-[9999]">
          <LoadingSplash onDone={markSplashDone} />
        </div>
      )}

      {/* Non-test routes: run LoadingSplashOriginal once per session (shared)
          Keep your "assetsReady gates onDone" behavior */}
      {shouldShowMainSplash && (
        <div className="fixed inset-0 z-[9999]">
          <LoadingSplashOriginal onDone={assetsReady ? markSplashDone : undefined} />
        </div>
      )}
    </div>
  );
}
