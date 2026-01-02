// NewsMobile.jsx
import { useRef, useEffect, useState } from "react";
import bg from "../assets/NewsDark.png";
import overlayBg from "../assets/NewLight.png";
import { TimeLineMobile } from "../components/TimeLineMobile";
import MobileNavbar from "../components/MobileNavbar";
// ❌ remove this:
// import { newsTimelineItems } from "../data/NewsItems";

// ✅ same JSON URL you use in News.jsx
const DATA_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/News.json";

export default function News() {
  const timelineRef = useRef(null);
  const [showNavbar, setShowNavbar] = useState(true);

  // Which image should be visible based on showNavbar?
  const targetSrc = showNavbar ? bg : overlayBg;

  // Two layers (A/B) and which one is visible
  const [active, setActive] = useState(0);
  const [srcs, setSrcs] = useState([targetSrc, targetSrc]);

  // ✅ state for remote items
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Crossfade when target changes (no loops, no flash)
  useEffect(() => {
    const currentlyVisible = srcs[active];
    if (currentlyVisible === targetSrc) return;

    let cancelled = false;
    const next = 1 - active;

    const img = new Image();
    img.src = targetSrc;

    const go = async () => {
      if (cancelled) return;
      try {
        if (img.decode) await img.decode();
      } catch {}
      // Update hidden layer with the new image
      setSrcs((prev) => {
        const copy = [...prev];
        copy[next] = targetSrc;
        return copy;
      });
      // Let browser paint once, then flip opacity to trigger the fade
      requestAnimationFrame(() => {
        if (!cancelled) setActive(next);
      });
    };

    if (img.complete) go();
    else img.onload = go;

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [targetSrc, active, srcs]);

  // Scroll logic for navbar
  useEffect(() => {
    const handleScroll = () => setShowNavbar(window.scrollY <= 0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ fetch items from JSON
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(DATA_URL, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load news: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setItems(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError("Could not load news timeline.");
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, []);

  return (
    <div className="relative min-h-screen w-full">
      {/* Background stack – fixed to viewport */}
      <div className="fixed inset-0 z-1 bg-[#0c1a22] overflow-hidden">
        {/* Layer A */}
        <img
          aria-hidden
          alt=""
          decoding="async"
          src={srcs[0]}
          className={`h-full w-full object-cover absolute inset-0 transition-opacity duration-700 ease-in-out will-change-[opacity] ${
            active === 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ objectPosition: "center" }}
        />
        {/* Layer B */}
        <img
          aria-hidden
          alt=""
          decoding="async"
          src={srcs[1]}
          className={`h-full w-full object-cover absolute inset-0 transition-opacity duration-700 ease-in-out will-change-[opacity] ${
            active === 1 ? "opacity-100" : "opacity-0"
          }`}
          style={{ objectPosition: "center" }}
        />
      </div>

      {/* Foreground content */}
      <header
        className="relative z-30 transition-opacity duration-500"
        style={{ opacity: showNavbar ? 1 : 0 }}
      >
        <MobileNavbar />
      </header>

      <section className="relative z-20 flex min-h-[40vh] items-center justify-center px-6">
        <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight absolute top-[30vh]">
          The Rise Reforming Timeline
        </h1>
      </section>

      <section ref={timelineRef} className="relative z-10">
        {loading && (
          <div className="py-10 text-center text-sm text-gray-300">
            Loading timeline…
          </div>
        )}

        {error && (
          <div className="py-10 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && (
          <TimeLineMobile
            items={items}
            backgroundUrl={bg}
            overlayUrl={overlayBg}
            color="#3ca6a6"
            dotSize={12}
            cardWidth={420}
          />
        )}
      </section>
    </div>
  );
}
