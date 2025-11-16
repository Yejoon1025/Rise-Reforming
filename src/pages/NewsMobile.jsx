// NewsMobile.jsx
import { useRef, useEffect, useState } from "react";
import bg from "../assets/NewsDark.png";
import overlayBg from "../assets/NewLight.png";
import { TimeLineMobile } from "../components/TimeLineMobile";
import MobileNavbar from "../components/MobileNavbar";
import { newsTimelineItems } from "../data/NewsItems";

export default function News() {
  const timelineRef = useRef(null);
  const [showNavbar, setShowNavbar] = useState(true);

  // Which image should be visible based on showNavbar?
  const targetSrc = showNavbar ? bg : overlayBg;

  // Two layers (A/B) and which one is visible
  const [active, setActive] = useState(0);
  const [srcs, setSrcs] = useState([targetSrc, targetSrc]);

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
        <TimeLineMobile
          items={newsTimelineItems}
          backgroundUrl={bg}
          overlayUrl={overlayBg}
          color="#3ca6a6"
          dotSize={12}
          cardWidth={420}
        />
      </section>
    </div>
  );
}