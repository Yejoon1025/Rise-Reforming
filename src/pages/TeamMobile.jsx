import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import bg1 from "../assets/TableBright.png";
import MobileNavbar from "../components/MobileNavbar";
import { ChevronDown } from "lucide-react";
import { CardFlipMobile } from "../components/CardFlipMobile";

// Remote profile JSON
const PROFILE_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Profile.json";

export default function TeamMobile() {
  // Pages:
  // 0 = hero
  // 1 = core team
  // 2 = advisors
  // 3 = investors   (NEW)
  // 4 = CTA -> news (moved down)
  const maxPg = 4; // last index
  const [pg, setPg] = useState(0);

  // Horizontal parallax positions for the background image per page.
  // Keep it subtle; clamping logic will prevent out-of-bounds anyway.
  const pos = [0, 0.3, -0.3, 0.3, 0];

  const containerRef = useRef(null);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);

  const maxRef = useRef(0);
  const [max, setMax] = useState(0);

  const [offset, setOffset] = useState(0);
  const [moving, setMoving] = useState(0);

  const imgRef = useRef(null);

  const navigate = useNavigate();

  // --- Profiles fetched from remote JSON ---
  const [exec, setExec] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [investors, setInvestors] = useState([]); // NEW

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch(PROFILE_URL);
        if (!res.ok) {
          throw new Error(`Failed to fetch profiles: ${res.status}`);
        }
        const data = await res.json();
        setExec(data.EXEC || []);
        setAdvisors(data.ADVISORS || []);
        setInvestors(data.INVESTORS || []); // NEW (matches desktop)
      } catch (err) {
        console.error("Error loading profiles from GitHub (mobile):", err);
      }
    };

    fetchProfiles();
  }, []);

  // --- Viewport-fit: eliminate mobile overscroll + toolbar jitter
  useEffect(() => {
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "none";

    const setVh = () => {
      document.documentElement.style.setProperty(
        "--app-dvh",
        `${window.innerHeight}px`
      );
    };
    setVh();
    window.addEventListener("resize", setVh);

    return () => {
      document.body.style.overscrollBehaviorY = prevBodyOverscroll;
      window.removeEventListener("resize", setVh);
    };
  }, []);

  // --- Sizing on image load
  const onLoad = useCallback(() => {
    const dim = imgRef.current;
    if (!dim) return;

    const height = window.innerHeight; // pairs with 100dvh container
    const widthAtHeight = (dim.naturalWidth * height) / dim.naturalHeight;

    widthRef.current = widthAtHeight;
    setWidth(widthAtHeight);

    const maxOffset = (widthAtHeight - window.innerWidth) / 2;
    maxRef.current = maxOffset;
    setMax(maxOffset);
  }, []);

  const calcOffset = (newPos) => {
    const w = widthRef.current;
    const m = maxRef.current;
    const newOffset = w * newPos;

    if (newOffset < 0 && newOffset < -m) return -m;
    if (newOffset > 0 && newOffset > m) return m;
    return newOffset;
  };

  // Keep offset synced when width changes (e.g., orientation)
  useEffect(() => {
    setOffset(calcOffset(pos[pg] ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const goDown = useCallback(() => {
    if (pg === maxPg) {
      navigate("/news"); // last page continues to News
      return;
    }
    setMoving(1);
    setOffset(calcOffset(pos[pg + 1] ?? 0));
    setPg(pg + 1);
  }, [pg, maxPg, navigate]);

  const goUp = useCallback(() => {
    if (pg === 0) return;
    setMoving(1);
    setOffset(calcOffset(pos[pg - 1] ?? 0));
    setPg(pg - 1);
  }, [pg]);

  // -----------------------------
  // Scroll / Gesture Logic
  // -----------------------------
  const THROTTLE_MS = 400;

  // Wheel/trackpad EMA (desktop-ish usage)
  const EMA_PERIOD = 40;
  const ALPHA = 2 / (EMA_PERIOD + 1);
  const emaRef = useRef(0);
  const lastScrollTsRef = useRef(0);

  const shouldTriggerWheel = useCallback((magnitude) => {
    const now = performance.now();
    const last = lastScrollTsRef.current || 0;

    const prevEma = emaRef.current || magnitude;
    const passesEma = magnitude > prevEma;
    const passesThrottle = now - last >= THROTTLE_MS;

    const nextEma = prevEma * (1 - ALPHA) + magnitude * ALPHA;
    emaRef.current = nextEma;

    if (passesEma && passesThrottle) {
      lastScrollTsRef.current = now;
      return true;
    }
    return false;
  }, []);

  // Touch swipe (mobile)
  const SWIPE_THRESHOLD_PX = 40;
  const VERTICAL_DOMINANCE_RATIO = 1.15;
  const gestureTriggeredRef = useRef(false);
  const touchStart = useRef({ x: null, y: null });

  const tryTriggerSwipe = useCallback(
    (dy, dx) => {
      const now = performance.now();
      if (now - (lastScrollTsRef.current || 0) < THROTTLE_MS) return false;

      const absDy = Math.abs(dy);
      const absDx = Math.abs(dx);
      const isVertical =
        absDy >= SWIPE_THRESHOLD_PX &&
        absDy > absDx * VERTICAL_DOMINANCE_RATIO;

      if (!isVertical) return false;

      lastScrollTsRef.current = now;
      if (dy > 0) goUp();
      else goDown();
      return true;
    },
    [goDown, goUp]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goUp();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goDown();
      }
    };

    const onWheel = (e) => {
      const magnitude = Math.abs(e.deltaY || 0);
      if (!shouldTriggerWheel(magnitude)) return;
      if (e.deltaY < 0) goUp();
      else if (e.deltaY > 0) goDown();
    };

    const onTouchStart = (e) => {
      if (e.touches?.length) {
        gestureTriggeredRef.current = false;
        touchStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const onTouchMove = (e) => {
      const ts = touchStart.current;
      if (ts.x == null || ts.y == null || gestureTriggeredRef.current) return;

      const dx = (e.touches?.[0]?.clientX ?? ts.x) - ts.x;
      const dy = (e.touches?.[0]?.clientY ?? ts.y) - ts.y;

      // If we're likely to consume this gesture, prevent native scrolling
      if (Math.abs(dy) > Math.abs(dx)) {
        e.preventDefault();
      }

      if (tryTriggerSwipe(dy, dx)) {
        gestureTriggeredRef.current = true;
      }
    };

    const endGesture = () => {
      gestureTriggeredRef.current = false;
      touchStart.current = { x: null, y: null };
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", endGesture, { passive: true });
    window.addEventListener("touchcancel", endGesture, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", endGesture);
      window.removeEventListener("touchcancel", endGesture);
    };
  }, [goUp, goDown, shouldTriggerWheel, tryTriggerSwipe]);

  // Resize (recalc image width at viewport height)
  useEffect(() => {
    const recalc = () => onLoad();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(recalc);
      ro.observe(document.documentElement);
    } else {
      window.addEventListener("resize", recalc);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", recalc);
    };
  }, [onLoad]);

  const imgCommon = {
    className: "w-auto max-w-none select-none pointer-events-none",
    style: { height: "100dvh" },
    onLoad,
    initial: { opacity: 0 },
    animate: { opacity: 1, x: offset },
    exit: { opacity: 0 },
    transition: {
      opacity: { duration: 0.35, ease: "easeInOut" },
      x: { type: "spring", stiffness: 220, damping: 28 },
    },
    draggable: false,
    onAnimationComplete: () => setMoving(0),
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-black"
      style={{
        height: "var(--app-dvh, 100dvh)",
        touchAction: "none",
      }}
    >
      <div className="z-100">
        <MobileNavbar />
      </div>

      {/* Page number display */}
      <div className="absolute bottom-2 left-2 z-20 text-white text-sm font-bahnschrift">
        {pg + 1}/{maxPg + 1}
      </div>

      {/* Background image */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 z-0">
        <AnimatePresence initial={false} mode="sync">
          <motion.img key="bg1" ref={imgRef} src={bg1} alt="" {...imgCommon} />
        </AnimatePresence>
      </div>

      {/* Foreground pages */}
      <div className="relative z-10 h-full w-full">
        {/* PAGE 0: HERO */}
        {pg === 0 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${
              moving === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <h1 className="absolute top-[25%] font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[70vw] mx-auto">
              Our Team
            </h1>
            <button
              onClick={goDown}
              aria-label="Continue"
              className="p-2 hover:opacity-80 transition-opacity absolute top-[85%]"
            >
              <ChevronDown className="text-[#f8da9c] animate-bounce" size={32} />
            </button>
          </div>
        )}

        {/* PAGE 1: CORE TEAM */}
        {pg === 1 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${
              moving === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <CardFlipMobile
              items={exec}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.5}
              anchorYRatio={0.2}
            />
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 text-[#f8da9c] text-xl font-bahnschrift">
              Core Team
            </div>
            <div className="absolute bottom-5 z-20 text-white/70 text-sm font-bahnschrift">
              ← → to move, tap to flip
            </div>
          </div>
        )}

        {/* PAGE 2: ADVISORS */}
        {pg === 2 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${
              moving === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <CardFlipMobile
              items={advisors}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.5}
              anchorYRatio={0.2}
            />
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 text-[#f8da9c] text-xl font-bahnschrift">
              Advisors
            </div>
            <div className="absolute bottom-5 z-20 text-white/70 text-sm font-bahnschrift">
              ← → to move, tap to flip
            </div>
          </div>
        )}

        {/* PAGE 3: INVESTORS (NEW) */}
        {pg === 3 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${
              moving === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <CardFlipMobile
              items={investors}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.5}
              anchorYRatio={0.2}
            />
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 text-[#f8da9c] text-xl font-bahnschrift">
              Notable Investors
            </div>
            <div className="absolute bottom-5 z-20 text-white/70 text-sm font-bahnschrift">
              ← → to move, tap to flip
            </div>
          </div>
        )}

        {/* PAGE 4: CTA TO NEWS (MOVED) */}
        {pg === 4 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${
              moving === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <h2 className="absolute top-[25%] font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[90vw] mx-auto">
              Head to the news tab to learn more about our journey ↓
            </h2>

            <button
              onClick={() => navigate("/news")}
              aria-label="Go to News"
              className="p-2 hover:opacity-80 transition-opacity absolute top-[85%]"
            >
              <ChevronDown className="text-[#f8da9c] animate-bounce" size={32} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
