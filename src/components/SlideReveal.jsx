// src/components/overlay-slide-reveal.jsx
import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

/**
 * Props:
 * - first: ReactNode
 * - second: ReactNode
 * - initial?: "first" | "second"   // default "first"
 * - onChange?: (0|1)=>void
 * - arrowColor?: string            // default "#f8da9c"
 * - className?: string
 */
export function SlideReveal({
  first,
  second,
  initial = "first",
  onChange,
  arrowColor = "#f8da9c",
  className = "",
}) {
  if (!first || !second) return null

  const [stage, setStage] = useState(initial === "second" ? 1 : 0) // 0=first, 1=second
  const [isAnimating, setIsAnimating] = useState(false)
  const overlayRef = useRef(null)
  const touchStartYRef = useRef(null)
  const animMs = 700
  const wheelThreshold = 22

  function goTo(next) {
    if (isAnimating || next === stage) return
    setIsAnimating(true)
    setStage(next)
    if (onChange) onChange(next)
  }

  useEffect(() => {
    if (!isAnimating) return
    const t = setTimeout(() => setIsAnimating(false), animMs + 40)
    return () => clearTimeout(t)
  }, [isAnimating])

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    let wheelLock = false
    let wheelTimer

    const onWheel = (e) => {
      if (wheelLock || isAnimating) return
      if (e.deltaY > wheelThreshold && stage === 0) {
        wheelLock = true
        goTo(1)
      } else if (e.deltaY < -wheelThreshold && stage === 1) {
        wheelLock = true
        goTo(0)
      }
      clearTimeout(wheelTimer)
      wheelTimer = setTimeout(() => (wheelLock = false), 250)
    }

    const onKey = (e) => {
      if (isAnimating) return
      if ((e.code === "Space" || e.code === "ArrowDown") && stage === 0) goTo(1)
      if ((e.code === "ArrowUp" || e.code === "PageUp") && stage === 1) goTo(0)
    }

    el.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("keydown", onKey)
    return () => {
      el.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", onKey)
      clearTimeout(wheelTimer)
    }
  }, [stage, isAnimating])

  function onTouchStart(e) {
    if (isAnimating) return
    touchStartYRef.current = e.touches?.[0]?.clientY ?? null
  }
  function onTouchEnd(e) {
    if (isAnimating) return
    const startY = touchStartYRef.current
    if (startY == null) return
    const endY = e.changedTouches?.[0]?.clientY ?? startY
    const delta = startY - endY // positive => swipe up
    if (delta > 28 && stage === 0) goTo(1)
    if (delta < -28 && stage === 1) goTo(0)
    touchStartYRef.current = null
  }

  return (
    <div
      ref={overlayRef}
      className={[
        "pointer-events-auto absolute inset-0 h-screen w-full overflow-hidden",
        "select-none",
        className,
      ].join(" ")}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-live="polite"
    >
      <div
        className={[
          "absolute inset-0 will-change-transform",
          "transition-transform duration-700 ease-out",
          stage === 0 ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        {/* Layer 1 (arrow only on this layer when visible) */}
        <div className="relative h-screen w-full">
          {first}

          {stage === 0 && (
            <div className="absolute inset-x-0 bottom-10 flex justify-center">
              <button
                aria-label="Reveal next layer"
                onClick={() => goTo(1)}
                className="group"
                disabled={isAnimating}
              >
                <ChevronDown
                  className="w-12 h-12 animate-bounce transition-transform group-active:translate-y-1"
                  style={{ color: arrowColor }}
                />
              </button>
            </div>
          )}
        </div>

        {/* Layer 2 (no arrow here) */}
        <div className="relative h-screen w-full">
          {second}
        </div>
      </div>
    </div>
  )
}
