import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import bg from "../assets/Top.png"
import flame from "../assets/Logo_Transparent.png"
import wordmark from "../assets/Logo_Text.png"

export default function LoadingSplashFast({ onDone }) {
  // Visual tuning
  const LOOK = useMemo(
    () => ({
      FLAME_H: "h-[116px] sm:h-[128px] md:h-[140px] lg:h-[156px] xl:h-[168px]",
      TEXT_H:  "h-[72px]  sm:h-[78px]  md:h-[86px]  lg:h-[94px]  xl:h-[102px]",
      OVERLAP: 65,
      BG_SHIFT_PX: 0,
      EXIT_MS: 1200, // slower & smoother
    }),
    []
  )

  // Timeline (up to "hold"); exit happens only after window has loaded.
  const t = useMemo(
    () => ({
      flameIn: 200,
      brighten: 200,
      slideLeft: 200,
      wordmarkIn: 200,
      hold: 500,
    }),
    []
  )
  const VISUAL_TOTAL = t.flameIn + t.brighten + t.slideLeft + t.wordmarkIn + t.hold

  const [stage, setStage] = useState("flameIn")
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

  // Orchestrate visuals
  useEffect(() => {
    const id1 = setTimeout(() => setStage("brighten"), t.flameIn)
    const id2 = setTimeout(() => setStage("slideLeft"), t.flameIn + t.brighten)
    const id3 = setTimeout(() => setStage("wordmarkIn"), t.flameIn + t.brighten + t.slideLeft)
    const id4 = setTimeout(() => setStage("hold"), t.flameIn + t.brighten + t.slideLeft + t.wordmarkIn)
    const id5 = setTimeout(() => setIsVisualsDone(true), VISUAL_TOTAL)
    return () => [id1, id2, id3, id4, id5].forEach(clearTimeout)
  }, [t, VISUAL_TOTAL])

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
    const end = setTimeout(() => {
      setHidden(true)
      if (onDone) onDone()
    }, LOOK.EXIT_MS)
    return () => clearTimeout(end)
  }, [isPageLoaded, isVisualsDone, hidden, LOOK.EXIT_MS, onDone])

  if (hidden) return null

  const isBright =
    stage === "brighten" ||
    stage === "slideLeft" ||
    stage === "wordmarkIn" ||
    stage === "hold" ||
    stage === "exit"

  const afterBrighten =
    stage === "slideLeft" || stage === "wordmarkIn" || stage === "hold" || stage === "exit"

  const showWordmark =
    stage === "wordmarkIn" || stage === "hold" || stage === "exit"

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] overflow-hidden pointer-events-none",
        stage === "brighten"
          ? "animate-bg-brighten"
          : afterBrighten
          ? "bg-brand-dark"
          : "bg-[#0a0d0f]",
        // Switch to keyframe animation for a smoother, GPU path
        stage === "exit" ? "animate-splash-exit" : "",
      ].join(" ")}
      style={{
        // Pass duration via CSS var so you can tweak in JS without editing CSS
        "--splash-exit-ms": `${LOOK.EXIT_MS}ms`,
        // Help the compositor
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        contain: "paint",
      }}
      aria-hidden="true"
    >
      {/* Background image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={bg}
          alt=""
          className={[
            "h-full w-full object-cover",
            isBright
              ? "brightness-100 transition-[filter] duration-[1600ms] ease-in-out"
              : "brightness-[0.3]",
          ].join(" ")}
          style={{
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
        <img ref={measureRef} src={wordmark} alt="" className={LOOK.TEXT_H} onLoad={recalcShift} />
      </div>

      {/* Centering layer */}
      <div className="absolute inset-0 grid place-items-center">
        {!showWordmark ? (
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
