import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoadingSplash from "./pages/LoadingSplash";

/* Lazy-load all routes (desktop + mobile) */
const Home = lazy(() => import("./pages/Home"));
const Tech = lazy(() => import("./pages/Tech"));
const Team = lazy(() => import("./pages/Team"));
const News = lazy(() => import("./pages/News"));
const HomeMobile = lazy(() => import("./pages/HomeMobile"));
const TechMobile = lazy(() => import("./pages/TechMobile"));
const TeamMobile = lazy(() => import("./pages/TeamMobile"));
const NewsMobile = lazy(() => import("./pages/NewsMobile"));

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

  // First-visit splash only
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem("firstLoadDone") !== "true";
    } catch {
      return true;
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
   * Splash lifecycle
   * ----------------------------------------- */
  const handleSplashDone = () => {
    try {
      sessionStorage.setItem("firstLoadDone", "true");
    } catch {}
    setShowSplash(false);
  };

  /* -----------------------------------------
   * Render: app is always behind splash
   * ----------------------------------------- */
  return (
    <div className="relative min-h-dvh bg-[#0a0d0f] text-white">
      {/* The real app — always rendered behind the splash */}
      <Suspense fallback={null}>
        <Routes location={location}>
          <Route path="/home" element={isMobile ? <HomeMobile /> : <Home />} />
          <Route path="/tech" element={isMobile ? <TechMobile /> : <Tech />} />
          <Route path="/team" element={isMobile ? <TeamMobile /> : <Team />} />
          <Route path="/news" element={isMobile ? <NewsMobile /> : <News />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>

      {/* Overlay splash only during first load */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999]">
          <LoadingSplash
            onDone={assetsReady ? handleSplashDone : undefined}
          />
        </div>
      )}
    </div>
  );
}
