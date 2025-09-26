import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react"
import { createPortal } from "react-dom"
import { useGlowDotController } from "../components/GlowDotMobileProvider"
import { X } from "lucide-react"

/**
 * GlowDotCentered (viewport-centered textbox)
 * - Textbox is rendered to document.body via a portal and fixed-centered in the viewport
 * - Not draggable
 * - All other behavior preserved (controller API, a11y, visibility, number badge, absolute dot pos)
 */
export const GlowDotMobile= forwardRef(function GlowDotMobile(props, _ref) {
  const {
    top = "50%",
    left = "50%",
    size = 10,
    color = "#3ca6a6",
    title,
    text = "Sample fact text goes here.",
    boxWidth = 300,
    className = "",
    ariaLabel = "Info dot",
    fadeMs = 220,
    dotId,
    boxNumber,

    // support absolute pixel placement of the DOT
    absolutePx = false,
    absX = null,
    absY = null,
  } = props

  const { register, setVisible, threshold } = useGlowDotController()
  const dotRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isPresent, setIsPresent] = useState(false)
  const [isFadingIn, setIsFadingIn] = useState(false)

  // --- mobile tap support + a11y ---
  const suppressClickRef = useRef(false)
  function onDotTouchStart(e) {
    suppressClickRef.current = true
    setIsOpen(prev => !prev)
    e.preventDefault()
    e.stopPropagation()
  }
  function onDotClick(e) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    // setIsOpen(prev => !prev)
  }
  function onDotKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setIsOpen(prev => !prev)
    }
  }

  // presence & fade
  useEffect(() => {
    if (isOpen) {
      setIsPresent(true)
      requestAnimationFrame(() => setIsFadingIn(true))
    } else {
      setIsFadingIn(false)
      const t = setTimeout(() => setIsPresent(false), fadeMs)
      return () => clearTimeout(t)
    }
  }, [isOpen, fadeMs])

  // helper
  function toCssUnit(v) { return typeof v === "number" ? `${v}px` : v }
  const dotPosStyle = {
    top: toCssUnit(top),
    left: toCssUnit(left),
    width: `${size}px`,
    height: `${size}px`,
    transform: "translate(-50%, -50%)", // center dot at top/left
  }

  // --- Absolute pixel positioning for the DOT center ---
  const [absLocal, setAbsLocal] = useState(null)
  function computeAbsLocal() {
    if (!(absolutePx && Number.isFinite(absX) && Number.isFinite(absY))) return null
    const parent = dotRef.current?.offsetParent
    if (parent && parent instanceof HTMLElement) {
      const prect = parent.getBoundingClientRect()
      return { left: absX - prect.left, top: absY - prect.top }
    }
    return { left: absX, top: absY }
  }
  useEffect(() => {
    if (!(absolutePx && Number.isFinite(absX) && Number.isFinite(absY))) { setAbsLocal(null); return }
    const recalc = () => setAbsLocal(computeAbsLocal())
    recalc()
    window.addEventListener("resize", recalc)
    window.addEventListener("scroll", recalc, { passive: true })
    return () => { window.removeEventListener("resize", recalc); window.removeEventListener("scroll", recalc) }
  }, [absolutePx, absX, absY])
  const dotStyle = (absolutePx && absLocal)
    ? { ...dotPosStyle, top: `${absLocal.top}px`, left: `${absLocal.left}px` }
    : dotPosStyle

  // --- viewport size for connector ---
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const set = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    set()
    window.addEventListener("resize", set)
    window.addEventListener("orientationchange", set)
    return () => { window.removeEventListener("resize", set); window.removeEventListener("orientationchange", set) }
  }, [])

  // re-render while open when scrolling so connector follows the dot
  const [, setScrollTick] = useState(0)
  useEffect(() => {
    if (!isPresent) return
    const onScroll = () => setScrollTick(t => (t + 1) % 1000000)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isPresent])

  function getDotViewportCenter() {
    const rect = dotRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
  }

  const fadeClass = isFadingIn ? "opacity-100" : "opacity-0"
  const fadeStyle = { transition: `opacity ${fadeMs}ms ease` }
  const peCls = isFadingIn ? "pointer-events-auto" : "pointer-events-none"

  // latest open for controller
  const isOpenRef = useRef(isOpen)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // imperative API
  useImperativeHandle(_ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    isOpen: () => isOpenRef.current,
  }), [])

  // controller registration
  useEffect(() => {
    if (!dotId) return
    const unregister = register(dotId, {
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      isOpen: () => isOpenRef.current,
      getRect: () => dotRef.current?.getBoundingClientRect() ?? null,
    })
    return unregister
  }, [dotId, register])

  // visibility report
  useEffect(() => {
    if (!dotRef.current || !dotId) return
    const obs = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        setVisible(dotId, entry.isIntersecting && entry.intersectionRatio >= threshold)
      },
      { threshold }
    )
    obs.observe(dotRef.current)
    return () => obs.disconnect()
  }, [dotId, setVisible, threshold])

  // connector endpoints (viewport space)
  const dotVC = getDotViewportCenter()
  const x1 = dotVC?.cx ?? 0
  const y1 = dotVC?.cy ?? 0
  const x2 = viewport.w / 2
  const y2 = viewport.h / 2

  // styles
  const coreStyle = { backgroundColor: color }
  const glowStyle = { backgroundColor: color }

  // portal content (ensures true viewport-centering regardless of transformed ancestors)
  const connectorPortal = (isPresent && viewport.w > 0 && viewport.h > 0)
    ? createPortal(
        <svg
          className={`fixed inset-0 pointer-events-none z-10 ${fadeClass}`}
          style={fadeStyle}
          width={viewport.w}
          height={viewport.h}
          viewBox={`0 0 ${viewport.w} ${viewport.h}`}
        >
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth="1.25" strokeLinecap="round" />
        </svg>,
        document.body
      )
    : null

  const textboxPortal = isPresent
    ? createPortal(
        <div
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#0c1a22]/85 text-white/90 z-40 ${fadeClass} ${peCls}`}
          style={{ width: boxWidth, ...fadeStyle }}
        >
          <div className="relative p-4 pt-3 pr-3">
            {/* Close (top-right) */}
            <button
              type="button"
              aria-label="Close textbox"
              className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md"
              style={{ color: "#a9b3b8" }}
              onClick={e => { e.stopPropagation(); setIsOpen(false) }}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Reserve vertical space for the dot above the text */}
            <div className="h-4" />

            {/* Centered text */}
            {title && (
              <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl leading-snug text-[#f8da9c]">
                {title}
              </p>
            )}
            {text && (
              <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl leading-snug">
                {text}
              </p>
            )}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div ref={dotRef} className={`absolute ${className}`} style={dotStyle}>
      {connectorPortal}

      {/* glow (under dot) */}
      <div
        className="absolute -inset-2 rounded-full blur-md opacity-70 animate-pulse pointer-events-none z-20"
        style={glowStyle}
      />

      {/* dot */}
      <button
        type="button"
        className="absolute inset-0 rounded-full shadow-[0_0_6px_1px_rgba(0,0,0,0.25)] outline-none focus:outline-none z-30"
        style={coreStyle}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onMouseEnter={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        onClick={onDotClick}
        onTouchStart={onDotTouchStart}
        onKeyDown={onDotKeyDown}
      />

      {/* number badge below the glow dot */}
      {(boxNumber !== undefined && boxNumber !== null && String(boxNumber).length > 0) && (
        <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 z-40">
          <span className="inline-flex h-6 min-w-6 px-2 items-center justify-center rounded-full bg-[#0c1a22]/85 text-white/90 text-xs font-medium pointer-events-none">
            {String(boxNumber)}
          </span>
        </div>
      )}

      {textboxPortal}
    </div>
  )
})