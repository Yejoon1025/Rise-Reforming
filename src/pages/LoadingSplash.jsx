import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import bg from "../assets/Top.png"
import flame from "../assets/Logo_Transparent.png"
import wordmark from "../assets/Logo_Text.png"

export default function LoadingSplash({ onDone }) {
  // Visual tuning
  const LOOK = useMemo(
    () => ({
      FLAME_H: "h-[116px] sm:h-[128px] md:h-[140px] lg:h-[156px] xl:h-[168px]",
      TEXT_H: "h-[72px]  sm:h-[78px]  md:h-[86px]  lg:h-[94px]  xl:h-[102px]",
      OVERLAP: 50,
      BG_SHIFT_PX: 0,
      EXIT_MS: 1200,

      // Tagline timing (total = IN + HOLD + OUT)
      // Longer presence than before
      TAGLINE_IN_MS: 1200,
      TAGLINE_HOLD_MS: 1800,
      TAGLINE_OUT_MS: 900,

      // Brightness levels for the background image
      // Dim from the start, tagline lifts it slightly, logo brightens to full.
      DIM_BRIGHTNESS: 0.3,
      TAGLINE_BRIGHTNESS: 0.45,
      FULL_BRIGHTNESS: 1.0,
    }),
    []
  )

  const TAGLINE_TOTAL =
    LOOK.TAGLINE_IN_MS + LOOK.TAGLINE_HOLD_MS + LOOK.TAGLINE_OUT_MS

  // Timeline (visuals); exit happens only after window has loaded.
  // Tagline phase comes before your existing logo sequence.
  const t = useMemo(
    () => ({
      flameIn: 700,
      brighten: 800,
      slideLeft: 600,
      wordmarkIn: 800,
      hold: 1500,
    }),
    []
  )

  const VISUAL_TOTAL_CORE =
    t.flameIn + t.brighten + t.slideLeft + t.wordmarkIn + t.hold
  const VISUAL_TOTAL = TAGLINE_TOTAL + VISUAL_TOTAL_CORE

  // Stages: tagline -> flameIn -> brighten -> slideLeft -> wordmarkIn -> hold -> exit
  const [stage, setStage] = useState("tagline")
  const [hidden, setHidden] = useState(false)

  // Gates
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [isVisualsDone, setIsVisualsDone] = useState(false)

  // For exact slide distance
  const measureRef = useRef(null)
  const [targetShift, setTargetShift] = useState(0)

  function recalcShift() {
    const w = measureRef.current?.offsetWidth || 0
    setTargetShift(-((w - LOOK.OVERLAP) / 2))
  }

  useLayoutEffect(() => {
    recalcShift()
    const onResize = () => recalcShift()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [LOOK.OVERLAP])

  // Orchestrate visuals (tagline first, then existing sequence)
  useEffect(() => {
    const base = TAGLINE_TOTAL

    const id0 = setTimeout(() => setStage("flameIn"), TAGLINE_TOTAL)
    const id1 = setTimeout(() => setStage("brighten"), base + t.flameIn)
    const id2 = setTimeout(
      () => setStage("slideLeft"),
      base + t.flameIn + t.brighten
    )
    const id3 = setTimeout(
      () => setStage("wordmarkIn"),
      base + t.flameIn + t.brighten + t.slideLeft
    )
    const id4 = setTimeout(
      () => setStage("hold"),
      base + t.flameIn + t.brighten + t.slideLeft + t.wordmarkIn
    )
    const id5 = setTimeout(() => setIsVisualsDone(true), VISUAL_TOTAL)

    return () => [id0, id1, id2, id3, id4, id5].forEach(clearTimeout)
  }, [t, TAGLINE_TOTAL, VISUAL_TOTAL])

  // Full page load
  useEffect(() => {
    if (document.readyState === "complete") {
      setIsPageLoaded(true)
      return
    }
    const onLoad = () => setIsPageLoaded(true)
    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [])

  // Exit when both are ready
  useEffect(() => {
    if (!isPageLoaded || !isVisualsDone || hidden) return
    setStage("exit")
    sessionStorage.setItem("rise_loading_splash_done_v1", "1");
    window.dispatchEvent(new Event("rise:splashDone"));
    const end = setTimeout(() => {
      setHidden(true)
      if (onDone) onDone()
    }, LOOK.EXIT_MS)
    return () => clearTimeout(end)
  }, [isPageLoaded, isVisualsDone, hidden, LOOK.EXIT_MS, onDone])

  if (hidden) return null

  // Background brightness control:
  // - tagline: slightly brighter than dim
  // - pre-brighten stages: dim
  // - brighten + after: full (current max)
  const bgBrightness =
    stage === "tagline"
      ? LOOK.TAGLINE_BRIGHTNESS
      : stage === "brighten" ||
        stage === "slideLeft" ||
        stage === "wordmarkIn" ||
        stage === "hold" ||
        stage === "exit"
      ? LOOK.FULL_BRIGHTNESS
      : LOOK.DIM_BRIGHTNESS

  const afterBrighten =
    stage === "slideLeft" || stage === "wordmarkIn" || stage === "hold" || stage === "exit"

  const showWordmark = stage === "wordmarkIn" || stage === "hold" || stage === "exit"
  const showTagline = stage === "tagline"

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] overflow-hidden pointer-events-none",
        stage === "brighten"
          ? "animate-bg-brighten"
          : afterBrighten
          ? "bg-brand-dark"
          : "bg-[#0a0d0f]",
        stage === "exit" ? "animate-splash-exit" : "",
      ].join(" ")}
      style={{
        "--splash-exit-ms": `${LOOK.EXIT_MS}ms`,
        "--tagline-ms": `${TAGLINE_TOTAL}ms`,
        "--tagline-in-ms": `${LOOK.TAGLINE_IN_MS}ms`,
        "--tagline-hold-ms": `${LOOK.TAGLINE_HOLD_MS}ms`,
        "--tagline-out-ms": `${LOOK.TAGLINE_OUT_MS}ms`,
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        contain: "paint",
      }}
      aria-hidden="true"
    >
      {/* Local-only tagline animation */}
      <style>{`
        @keyframes splashTagline {
          0%   { opacity: 0; transform: translateY(8px); }
          ${Math.round((LOOK.TAGLINE_IN_MS / TAGLINE_TOTAL) * 100)}% { opacity: 1; transform: translateY(0px); }
          ${Math.round(((LOOK.TAGLINE_IN_MS + LOOK.TAGLINE_HOLD_MS) / TAGLINE_TOTAL) * 100)}% { opacity: 1; transform: translateY(0px); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .splash-tagline {
          animation: splashTagline var(--tagline-ms) cubic-bezier(0.2, 0.9, 0.2, 1) both;
          will-change: opacity, transform;
        }
      `}</style>

      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={bg}
          alt=""
          className="h-full w-full object-cover transition-[filter] duration-[900ms] ease-in-out"
          style={{
            filter: `brightness(${bgBrightness})`,
            transform: `translateY(${LOOK.BG_SHIFT_PX}px)`,
            willChange: "transform, filter",
          }}
          draggable="false"
          onLoad={recalcShift}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Offscreen wordmark for measuring responsive width */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
        <img
          ref={measureRef}
          src={wordmark}
          alt=""
          className={LOOK.TEXT_H}
          onLoad={recalcShift}
        />
      </div>

      {/* Centering layer */}
      <div className="absolute inset-0 grid place-items-center">
        {showTagline ? (
          <div className="h-full w-full flex items-center justify-center">
            <h1 className="splash-tagline font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[70vw] mx-auto drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
              It&apos;s time for a paradigm shift in chemical manufacturing
            </h1>
          </div>
        ) : !showWordmark ? (
          <img
            src={flame}
            alt="Rise Reforming mark"
            className={[
              LOOK.FLAME_H,
              "select-none",
              stage === "flameIn"
                ? "opacity-0 scale-75 animate-flame-in drop-shadow-[0_4px_12px_rgba(248,218,156,0.35)]"
                : stage === "brighten"
                ? "opacity-100 scale-100 animate-flame-glow"
                : "opacity-100 scale-100 drop-shadow-[0_6px_18px_rgba(248,218,156,0.45)]",
              "transition-transform duration-700 ease-out",
            ].join(" ")}
            style={{
              willChange: "transform, filter",
              transform:
                stage === "slideLeft" || stage === "wordmarkIn" || stage === "hold" || stage === "exit"
                  ? `translateX(${targetShift}px)`
                  : "translateX(0px)",
            }}
            draggable="false"
          />
        ) : (
          <div className="relative flex items-center gap-0 leading-none">
            <img
              src={flame}
              alt="Rise Reforming mark"
              className={[
                LOOK.FLAME_H,
                "select-none transition-[filter] duration-500 ease-in-out",
                "drop-shadow-[0_6px_18px_rgba(248,218,156,0.45)]",
              ].join(" ")}
              draggable="false"
            />
            <img
              src={wordmark}
              alt="RISE REFORMING"
              className={[
                LOOK.TEXT_H,
                "select-none",
                stage === "wordmarkIn" ? "animate-wordmark-fade-in" : "opacity-100",
              ].join(" ")}
              style={{ marginLeft: `-${LOOK.OVERLAP}px` }}
              draggable="false"
            />
          </div>
        )}
      </div>
    </div>
  )
}
