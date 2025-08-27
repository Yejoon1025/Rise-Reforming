import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react"
import { useGlowDotController } from "../components/GlowDotProvider"

export const GlowDot = forwardRef(function GlowDot(props, _ref) {
  const {
    top = "50%",
    left = "50%",
    size = 10,
    color = "#3ca6a6",
    text = "Sample fact text goes here.",
    boxWidth = 300,
    className = "",
    ariaLabel = "Info dot",
    fadeMs = 220,
    dotId,

    // placement
    defaultSide = "auto",
    defaultGap = 24,
    viewportPadding = 16,

    // NEW: clamp inside this element’s rect (e.g., sectionRef)
    boundsRef = null,
  } = props

  const { register, setVisible, threshold } = useGlowDotController()
  const dotRef = useRef(null)
  const boxRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isPresent, setIsPresent] = useState(false)
  const [isFadingIn, setIsFadingIn] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [hasUserMoved, setHasUserMoved] = useState(false)

  const [boxOffset, setBoxOffset] = useState({ x: 60, y: 0 })
  const boxOffsetRef = useRef(boxOffset)
  useEffect(() => { boxOffsetRef.current = boxOffset }, [boxOffset])

  const [boxSize, setBoxSize] = useState({ w: boxWidth, h: 0 })

  // snap state
  const [isSnapping, setIsSnapping] = useState(false)
  const snapMs = 280

  // latest open for controller
  const isOpenRef = useRef(isOpen)
  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  // presence
  useEffect(() => {
    if (isOpen) {
      setPlaced(false)
      setIsPresent(true)
    } else {
      setIsFadingIn(false)
      const t1 = setTimeout(() => setIsPresent(false), fadeMs)
      const t2 = setTimeout(() => setHasUserMoved(false), fadeMs)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [isOpen, fadeMs])

  function toCssUnit(v) { return typeof v === "number" ? `${v}px` : v }
  const posStyle = {
    top: toCssUnit(top),
    left: toCssUnit(left),
    width: `${size}px`,
    height: `${size}px`,
    transform: "translate(-50%, -50%)",
  }

  // measure textbox
  useLayoutEffect(() => {
    if (!boxRef.current) return
    const el = boxRef.current
    const ro = new ResizeObserver(es => {
      const r = es[0].contentRect
      setBoxSize({ w: r.width, h: r.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setBoxSize({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [isPresent, boxWidth, text])

  // ---------- geometry helpers ----------
  function getBoundsRect() {
    // prefer explicit boundsRef
    if (boundsRef?.current) return boundsRef.current.getBoundingClientRect()

    // else try offsetParent (closest positioned ancestor)
    const parent = dotRef.current?.offsetParent
    if (parent && parent instanceof HTMLElement) return parent.getBoundingClientRect()

    // fallback to viewport
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, right: window.innerWidth, bottom: window.innerHeight }
  }

  function getDotViewportCenter() {
    const rect = dotRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
  }

  // Clamp offset within bounds rect (NOT global window)
  function clampOffset(x, y) {
    const dot = getDotViewportCenter()
    if (!dot) return { x, y }

    const bounds = getBoundsRect()
    const bxLeft = bounds.left + viewportPadding
    const bxTop = bounds.top + viewportPadding
    const bxRight = (bounds.right ?? bounds.left + bounds.width) - viewportPadding
    const bxBottom = (bounds.bottom ?? bounds.top + bounds.height) - viewportPadding

    let nx = x, ny = y
    const leftPx = dot.cx + nx - boxSize.w / 2
    const topPx = dot.cy + ny - boxSize.h / 2
    const rightPx = leftPx + boxSize.w
    const bottomPx = topPx + boxSize.h

    if (leftPx < bxLeft) nx += bxLeft - leftPx
    if (rightPx > bxRight) nx -= rightPx - bxRight
    if (topPx < bxTop) ny += bxTop - topPx
    if (bottomPx > bxBottom) ny -= bottomPx - bxBottom

    return { x: nx, y: ny }
  }

  function computeDefaultOffset() {
    const dot = getDotViewportCenter()
    if (!dot) return { x: 60, y: 0 }

    const bounds = getBoundsRect()
    const vw = bounds.width ?? (bounds.right - bounds.left)
    const { cx: dotCx } = dot

    const candidates = {
      right: { x: defaultGap + boxSize.w / 2 + size / 2, y: 0 },
      left:  { x: -(defaultGap + boxSize.w / 2 + size / 2), y: 0 },
      top:   { x: 0, y: -(defaultGap + boxSize.h / 2 + size / 2) },
      bottom:{ x: 0, y:  (defaultGap + boxSize.h / 2 + size / 2) },
    }

    function visScore(offs) {
      const { cx, cy } = getDotViewportCenter() || { cx: 0, cy: 0 }
      const b = getBoundsRect()
      const Lb = b.left, Tb = b.top, Rb = b.right ?? b.left + b.width, Bb = b.bottom ?? b.top + b.height
      const { x, y } = clampOffset(offs.x, offs.y)
      const L = cx + x - boxSize.w / 2, T = cy + y - boxSize.h / 2
      const R = L + boxSize.w, B = T + boxSize.h
      const visW = Math.max(0, Math.min(R, Rb) - Math.max(L, Lb))
      const visH = Math.max(0, Math.min(B, Bb) - Math.max(T, Tb))
      return (visW * visH) / (boxSize.w * boxSize.h + 1e-6)
    }

    let chosen
    if (defaultSide !== "auto") chosen = defaultSide
    else {
      const preferRight = dotCx < (bounds.left + vw / 2)
      const order = preferRight ? ["right", "left", "bottom", "top"] : ["left", "right", "bottom", "top"]
      chosen = order.reduce((best, s) => (visScore(candidates[s]) > visScore(candidates[best]) ? s : best), order[0])
    }

    return clampOffset(candidates[chosen].x, candidates[chosen].y)
  }

  // initial placement + fade-in
  useLayoutEffect(() => {
    if (!isPresent || hasUserMoved) return
    const place = () => {
      if (boxSize.w === 0 || boxSize.h === 0) return requestAnimationFrame(place)
      setBoxOffset(prev => {
        const next = computeDefaultOffset()
        if (Math.abs(next.x - prev.x) < 0.5 && Math.abs(next.y - prev.y) < 0.5) return prev
        return next
      })
      setPlaced(true)
      requestAnimationFrame(() => setIsFadingIn(true))
    }
    place()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent, hasUserMoved, boxSize.w, boxSize.h, defaultSide, defaultGap, viewportPadding, boundsRef])

  // resize reflow if user hasn't moved
  useEffect(() => {
    if (!isPresent || hasUserMoved) return
    const onResize = () => {
      setBoxOffset(prev => {
        const next = computeDefaultOffset()
        if (Math.abs(next.x - prev.x) < 0.5 && Math.abs(next.y - prev.y) < 0.5) return prev
        return next
      })
    }
    window.addEventListener("resize", onResize)
    window.addEventListener("orientationchange", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("orientationchange", onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent, hasUserMoved, boxSize.w, boxSize.h, defaultSide, defaultGap, viewportPadding, boundsRef])

  // dragging
  const drag = useRef({ on: false, sx: 0, sy: 0, bx: 0, by: 0, frame: null, nx: 0, ny: 0 })
  function onDragStart(e) {
    const d = drag.current
    d.on = true
    d.sx = "touches" in e ? e.touches[0].clientX : e.clientX
    d.sy = "touches" in e ? e.touches[0].clientY : e.clientY
    d.bx = boxOffsetRef.current.x
    d.by = boxOffsetRef.current.y
    d.nx = d.bx
    d.ny = d.by
    setIsSnapping(false)
    setHasUserMoved(true)
    e.preventDefault()
    e.stopPropagation() // prevent parent scroll/slide handlers from reacting
  }
  function schedule() {
    const d = drag.current
    if (d.frame) return
    d.frame = requestAnimationFrame(() => {
      setBoxOffset({ x: d.nx, y: d.ny })
      d.frame = null
    })
  }
  function onDragMove(e) {
    const d = drag.current
    if (!d.on) return
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY
    d.nx = d.bx + (cx - d.sx)
    d.ny = d.by + (cy - d.sy)
    schedule()
    e.preventDefault()
    e.stopPropagation()
  }
  function onDragEnd(e) {
    const d = drag.current
    d.on = false
    if (d.frame) { cancelAnimationFrame(d.frame); d.frame = null }
    e?.stopPropagation?.()

    // use latest pointer values, then clamp within bounds
    const latest = { x: d.nx, y: d.ny }
    const clamped = clampOffset(latest.x, latest.y)
    const needsSnap = Math.abs(clamped.x - latest.x) > 0.5 || Math.abs(clamped.y - latest.y) > 0.5

    if (needsSnap) {
      setIsSnapping(true)
      setBoxOffset(clamped)
      setTimeout(() => setIsSnapping(false), snapMs)
    } else {
      setBoxOffset(latest)
    }
  }
  useEffect(() => {
    window.addEventListener("mousemove", onDragMove)
    window.addEventListener("mouseup", onDragEnd)
    window.addEventListener("touchmove", onDragMove, { passive: false })
    window.addEventListener("touchend", onDragEnd)
    return () => {
      window.removeEventListener("mousemove", onDragMove)
      window.removeEventListener("mouseup", onDragEnd)
      window.removeEventListener("touchmove", onDragMove)
      window.removeEventListener("touchend", onDragEnd)
    }
  }, [])

  // connector
  const dotCenter = { x: size / 2, y: size / 2 }
  const boxCenter = { x: boxOffset.x + boxSize.w / 2, y: boxOffset.y + boxSize.h / 2 }
  const minX = Math.min(dotCenter.x, boxCenter.x)
  const minY = Math.min(dotCenter.y, boxCenter.y)
  const width = Math.max(1, Math.abs(boxCenter.x - dotCenter.x))
  const height = Math.max(1, Math.abs(boxCenter.y - dotCenter.y))
  const x1 = dotCenter.x - minX
  const y1 = dotCenter.y - minY
  const x2 = boxCenter.x - minX
  const y2 = boxCenter.y - minY

  // styles
  const coreStyle = { backgroundColor: color }
  const glowStyle = { backgroundColor: color }
  const fadeClass = isFadingIn ? "opacity-100" : "opacity-0"
  const fadeStyle = { transition: `opacity ${fadeMs}ms ease` }
  const hiddenStyle = placed ? {} : { opacity: 0, visibility: "hidden" }
  const peCls = isFadingIn ? "pointer-events-auto" : "pointer-events-none"
  const snapStyle = isSnapping ? { transition: `transform ${snapMs}ms cubic-bezier(0.2, 0.8, 0.2, 1)` } : {}

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

  return (
    <div ref={dotRef} className={`absolute ${className}`} style={posStyle}>
      {/* connector (behind dot) */}
      {isPresent && (
        <svg
          className={`absolute pointer-events-none z-10 ${fadeClass}`}
          style={{ left: minX, top: minY, width, height, ...fadeStyle, ...hiddenStyle }}
          viewBox={`0 0 ${width} ${height}`}
        >
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#374151" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      )}

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
        onMouseEnter={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(false)}
      />

      {/* textbox */}
      {isPresent && (
        <div
          ref={boxRef}
          className={`absolute rounded-2xl bg-[#0c1a22]/85 text-[#e0e0e0] shadow-xl backdrop-blur-sm px-4 py-3 select-none cursor-move z-40 will-change-transform ${fadeClass} ${peCls}`}
          style={{
            width: boxWidth,
            transform: `translate3d(${boxOffset.x}px, ${boxOffset.y}px, 0)`,
            ...fadeStyle,
            ...snapStyle,
            ...hiddenStyle,
          }}
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-snug">{text}</p>
        </div>
      )}
    </div>
  )
})
