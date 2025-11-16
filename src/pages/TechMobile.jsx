import { useRef, useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import bg0 from "../assets/TechDark.png";
import bg1 from "../assets/TechOne.png";
import bg2 from "../assets/TechTwo.png";
import { GlowDotMobile } from "../components/GlowDotMobile";
import { GlowDotMobileProvider } from "../components/GlowDotMobileProvider";
import * as text from "../data/PageContent";
import MobileNavbar from "../components/MobileNavbar";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Test() {
  const maxPg = 11; // minus one
  const [pg, setPg] = useState(0);

  const pos = [0, 0.001, -0.2, 0.15, 0.16, -0.3, 0.15, 0, 0.09, -0.2, 0.3, 0]; // Reverse from middle
  const dotX = [0.7, 0.35, 0.35, 0.8, 0.35, 0.41, 0.7, 0.2];
  const dotY = [0.35, 0.3, 0.3, 0.68, 0.3, 0.1, 0.35, 0.7];

  const containerRef = useRef(null);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    widthRef.current = width;
    setOffset(calcOffset(pos[pg]));
  }, [width]);

  const maxRef = useRef(0);
  const [max, setMax] = useState(0);
  useEffect(() => {
    maxRef.current = max;
  }, [max]);

  const [topLeft, setTopLeft] = useState(0);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    setTopLeft(currentXP());
  }, [offset]);

  const [moving, setMoving] = useState(0);

  const imgRef = useRef(null);

  const navigate = useNavigate();

  // --- Viewport-fit: eliminate mobile overscroll + toolbar jitter
  useEffect(() => {
    // Prevent scroll chaining / rubber banding
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "none";

    // Ensure the app fully pins to the viewport height
    const setVh = () => {
      // modern browsers support dvh; keep a fallback anyway
      document.documentElement.style.setProperty("--app-dvh", `${window.innerHeight}px`);
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

  const goDown = useCallback(() => {
    if (pg === maxPg) {navigate("/team")};
    setMoving(1);
    setOffset(calcOffset(pos[pg + 1]));
    setPg(pg + 1);
  }, [pg]);

  const goUp = useCallback(() => {
    if (pg === 0) return;
    setMoving(1);
    setOffset(calcOffset(pos[pg - 1]));
    setPg(pg - 1);
  }, [pg]);

  const currentXP = () => {
    const xPercentage = ((0.5 * width) - offset - window.innerWidth / 2) / width;
    return xPercentage;
  };

  const calcOffset = (newPos) => {
    const w = widthRef.current;
    const m = maxRef.current;
    const newOffset = w * newPos;
    if (newOffset < 0 && newOffset < -m) return -m;
    if (newOffset > 0 && newOffset > m) return m;
    return newOffset;
  };

  // -----------------------------
  // Scroll / Gesture Logic
  // -----------------------------
  const THROTTLE_MS = 400;

  // Keep EMA for wheel/trackpad only (desktop)
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

  // Touch-specific (mobile): simple, robust vertical swipe
  const SWIPE_THRESHOLD_PX = 40; // min vertical delta
  const VERTICAL_DOMINANCE_RATIO = 1.15; // |dy| must exceed |dx| * ratio
  const gestureTriggeredRef = useRef(false);
  const touchStart = useRef({ x: null, y: null });

  const tryTriggerSwipe = useCallback((dy, dx) => {
    const now = performance.now();
    if (now - (lastScrollTsRef.current || 0) < THROTTLE_MS) return false;

    const absDy = Math.abs(dy);
    const absDx = Math.abs(dx);
    const isVertical = absDy >= SWIPE_THRESHOLD_PX && absDy > absDx * VERTICAL_DOMINANCE_RATIO;

    if (!isVertical) return false;

    lastScrollTsRef.current = now;
    if (dy > 0) goUp();
    else goDown();
    return true;
  }, [goDown, goUp]);

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

    // Touch events (non-passive so we can prevent default scroll)
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

      // If we�셱e likely to consume this gesture, prevent native scrolling
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
    style: { height: "100dvh" }, // exact viewport fit
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
        height: "var(--app-dvh, 100dvh)", // uses innerHeight; falls back to 100dvh
        touchAction: "none",              // tells UA we�셪l handle gestures
      }}
    >
      <MobileNavbar />
      {/* Page number display */}
      <div className="absolute bottom-2 left-2 z-20 text-white text-sm font-bahnschrift">
        {pg + 1}/{maxPg + 1}
      </div>
      <div className="absolute left-1/2 top-0 -translate-x-1/2 z-0">
        <AnimatePresence initial={false} mode="sync">
          {pg === 0 && (
            <motion.img key="bg0" ref={imgRef} src={bg0} alt="" {...imgCommon} />
          )}
          {pg < 7 && (
            <motion.img key="bg1" ref={imgRef} src={bg1} alt="" {...imgCommon} />
          )}
          {pg < 12 && (
            <motion.img key="bg2" ref={imgRef} src={bg2} alt="" {...imgCommon} />
          )}
        </AnimatePresence>
      </div>

      <div
        className={`absolute bottom-2 right-5 z-[60] group transition-opacity duration-700 flex items-center`}
      >

        {/* Chevron icon button */}
        <button
          onClick={() => goDown()}
          aria-label="Down"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronDown className="text-[#f8da9c]" size={32} />

        </button>
      </div>

      <div
        className={`absolute bottom-10 right-5 z-[60] group transition-opacity duration-700 flex items-center ${pg === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >

        {/* Chevron icon button */}
        <button
          onClick={() => goUp()}
          aria-label="Up"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronUp className="text-[#f8da9c]" size={32} />

        </button>
      </div>

      <div className="relative z-10 h-full w-full">

        {(pg > 1 && pg < 7) && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 text-[#f8da9c] text-xl font-bahnschrift">
              Chemical Process
            </div>
        )}
        {(pg > 7 && pg < 11) && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 text-[#f8da9c] text-l font-bahnschrift">
              Competitive Advantages
            </div>
        )}

        {pg === 0 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[70vw] mx-auto">
              Our Technology
            </h1>
          </div>
        )}

        {pg === 1 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <h2 className="absolute top-[50%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
              In Simple Terms, We:
            </h2>
          </div>
        )}

        {pg === 2 && (
          <div
            className={`transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[0] - topLeft) * width}
                absY={dotY[0] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="1"
                title={text.Tech1Title}
                text={text.Tech1}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 3 && (
          <div
            className={`transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[1] - topLeft) * width}
                absY={dotY[1] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="1"
                title={text.Tech2Title}
                text={text.Tech2}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 4 && (
          <div
            className={`transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[2] - topLeft) * width}
                absY={dotY[2] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="2"
                text={text.Tech3}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 5 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[3] - topLeft) * width}
                absY={dotY[3] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="2"
                title={text.Tech5Title}
                text={text.Tech5}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 6 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[4] - topLeft) * width}
                absY={dotY[4] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="1"
                text={text.Tech4}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 7 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <h2 className="absolute top-[50%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
              Our Process Is:
            </h2>
          </div>
        )}

        {pg === 8 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[5] - topLeft) * width}
                absY={dotY[5] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="1"
                title={text.Tech6Title}
                text={text.Tech6}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 9 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[6] - topLeft) * width}
                absY={dotY[6] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="1"
                title={text.Tech7Title}
                text={text.Tech7}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 10 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <GlowDotMobileProvider baseRef={imgRef} openStrategy="next" threshold={0.3}>
              <GlowDotMobile
                absolutePx={true}
                absX={(dotX[7] - topLeft) * width}
                absY={dotY[7] * window.innerHeight}
                defaultOffsetX={-145}
                defaultOffsetY={-40}
                dotId="1"
                title={text.Tech8Title}
                text={text.Tech8}
                boundsRef={imgRef}
              />
            </GlowDotMobileProvider>
          </div>
        )}

        {pg === 11 && (
          <div
            className={`h-full w-full flex items-center justify-center transition-opacity duration-150 ${moving === 0 ? "opacity-100" : "opacity-0"
              }`}
          >
            <h2 className="absolute top-[40%] font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[90vw] mx-auto">
              Go down to learn about our team
             </h2>
          </div>
        )}
      </div>
    </div>
  );
}