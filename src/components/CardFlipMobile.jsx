// src/components/CardFlip.jsx — mobile-friendly tweak
// • On narrow screens (<640px):
//    - Dot is centered horizontally
//    - Exactly one card is shown per screen (full-viewport lane spacing)
//    - Text remains BELOW the dot (unchanged positioning)
// • All interactions/behaviors preserved (flip, sweep, keyboard, swipe, etc.)

import { useEffect, useRef, useState, useLayoutEffect } from "react"
import { ChevronLeft, ChevronRight, RotateCw, Linkedin, Mail } from "lucide-react"

export function CardFlipMobile({
  items = [],
  color = "#3ca6a6",
  progressColor,
  dotSize = 12,
  cardWidth = 320,
  overlapPx = 64,
  anchorXRatio = 0.28,
  anchorYRatio = 1 / 3,
  className = "",
  reversed = false, // mirror horizontally
}) {
  // refs & layout
  const sectionRef = useRef(null)
  const scrollerRef = useRef(null)
  const panelsRef = useRef([])

  // order & active
  const [order, setOrder] = useState(items.map((_, i) => i))
  const displayItems = order.map(i => items[i])
  const [active, setActive] = useState(0)

  // card sizing & paddings
  const [computedCardW, setComputedCardW] = useState(cardWidth)
  const [computedCardH, setComputedCardH] = useState(Math.round(cardWidth * CARD_RATIO))
  const [articleW, setArticleW] = useState(Math.max(220, cardWidth - overlapPx))
  const [startPad, setStartPad] = useState(0)
  const [endPad, setEndPad] = useState(0)
  const [isCrowded, setIsCrowded] = useState(false)

  // flip state
  const [flipped, setFlipped] = useState({})

  // timeline geometry (DOM-space)
  const [dotLeft, setDotLeft] = useState(0)
  const [dotBottom, setDotBottom] = useState(0)
  const [dotTop, setDotTop] = useState(0)
  const [lineLeft, setLineLeft] = useState(0)
  const [lineWidth, setLineWidth] = useState(0)
  const [progressLeftW, setProgressLeftW] = useState(0)

  // sweep state
  const isAutoScrollingRef = useRef(false)
  const scrollIdleTimerRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const sweepTO2 = useRef(null)
  const [isSweeping, setIsSweeping] = useState(false)
  const [sweepPhase, setSweepPhase] = useState("idle") // idle | up
  const [sweepKeys, setSweepKeys] = useState([])
  const [sweepY, setSweepY] = useState(240)

  // freeze appearance of non-moving cards during sweep
  const frozenInZoneRef = useRef(new Map())

  // wheel/touch → discrete nav
  const WHEEL_COOLDOWN_MS = 320
  const wheelCooldownRef = useRef(false)
  const touchStartXRef = useRef(0)
  const touchDeltaXRef = useRef(0)
  const touchActiveRef = useRef(false)
  const SWIPE_THRESHOLD = 36

  const didInitRef = useRef(false)
  const [isIntersecting, setIsIntersecting] = useState(false)

  // Hints (dismiss after first use)
  const [dismissedLeftHint, setDismissedLeftHint] = useState(false)
  const [dismissedRightHint, setDismissedRightHint] = useState(false)
  const [dismissedFlipHint, setDismissedFlipHint] = useState(false)
  const GOLD = "#f8da9c"

  // tunables
  const HYSTERESIS_RATIO = 0.22
  const SOFT_ZONE_RATIO = 0.01
  const progColor = progressColor || color
  const GAP_PX = 16
  const FOCUS_SCALE = 1.14
  const UNFOCUS_SCALE = 0.9
  const ICONS_HB = 40
  const IDLE_MS = 500
  const SWEEP_UP_MS = 200
  const FADE_MS = 200
  const GROW_MS = 200
  const keyFor = (originalIndex, it) => it.id ?? originalIndex

  // timeline visibility & grow flags
  const [showLeftTimeline, setShowLeftTimeline] = useState(true)
  const [animateRightGrow, setAnimateRightGrow] = useState(false)

  // keep order in sync with items
  useEffect(() => {
    setOrder(prev => (prev.length === items.length ? prev : items.map((_, i) => i)))
  }, [items.length])

  // initial scroll pos
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollLeft = 0
  }, [])

  // Observer to activate/deactivate controls when in/out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.1 }
    )

    const currentSection = sectionRef.current
    if (currentSection) observer.observe(currentSection)

    return () => {
      if (currentSection) observer.unobserve(currentSection)
    }
  }, [])

  // Horizontal Bounce
  useEffect(() => {
    if (document.getElementById("cardflip-hints-kf")) return
    const el = document.createElement("style")
    el.id = "cardflip-hints-kf"
    el.textContent = `
@keyframes cardflip-nudge-x {
  0%, 100% { transform: translateX(0) }
  50%      { transform: translateX(var(--nudge-amp, 5px)) }
}`
    document.head.appendChild(el)
  }, [])

  // helper: screen-space anchor (post-mirror)
  function getAnchorXScreen() {
    const vw = window.innerWidth || 0
    return reversed ? vw - dotLeft : dotLeft
  }

  // compute layout & timeline metrics
  useLayoutEffect(() => {
    function computeLayout() {
      const scroller = scrollerRef.current
      if (!scroller) return

      const vw = window.innerWidth || 0
      const vh = window.innerHeight || 0
      if (!vw || !vh) return

      // *** MOBILE MODE (one-card view + centered dot) ***
      const isMobile = vw < 640
      const effectiveAnchorXRatio = isMobile ? 0.5 : clamp(anchorXRatio, 0.05, 0.5)

      const leftPx = Math.round(vw * effectiveAnchorXRatio) // DOM-space anchor
      const bottomPx = Math.round(vh * clamp(anchorYRatio, 0.15, 0.85))
      const topPx = vh - bottomPx
      setDotLeft(leftPx)
      setDotBottom(bottomPx)
      setDotTop(topPx)

      const cw = computeCardWidth(vw, cardWidth)
      const ch = Math.round(cw * CARD_RATIO)
      setComputedCardW(cw)
      setComputedCardH(ch)

      // --- DYNAMIC SPACING CALCULATION ---
      let finalArticleW
      const N = items.length

      if (N > 1) {
        // Default spacing based on original logic
        const defaultArticleW = cw - overlapPx
        const clampedDefaultArticleW = Math.max(220, defaultArticleW)

        // Fit check
        const SCREEN_EDGE_BUFFER = 48
        const defaultTotalWidth = leftPx + (N - 1) * clampedDefaultArticleW + cw / 2

        if (defaultTotalWidth > vw - SCREEN_EDGE_BUFFER) {
          const requiredArticleW = (vw - SCREEN_EDGE_BUFFER - leftPx - cw / 2) / (N - 1)
          finalArticleW = requiredArticleW
        } else {
          finalArticleW = clampedDefaultArticleW
        }
      } else {
        finalArticleW = Math.max(220, cw - overlapPx)
      }

      // **Mobile override: guarantee exactly one card per viewport**
      if (isMobile) {
        finalArticleW = vw // one lane per screen so neighbors never peek in
      }

      const aw = Math.round(finalArticleW)
      setArticleW(aw)

      const CROWDED_THRESHOLD_PX = 160 // Spacing below which text is hidden
      setIsCrowded(aw < CROWDED_THRESHOLD_PX)
      // --- END DYNAMIC SPACING CALCULATION ---

      setStartPad(Math.max(0, leftPx - aw / 2))
      setEndPad(Math.max(0, Math.ceil((vw - leftPx) - aw / 2) + 4))

      const firstEl = panelsRef.current[0]
      const lastEl = panelsRef.current[displayItems.length - 1]
      const s = scroller.scrollLeft

      let firstCenter = leftPx
      let lastCenter = leftPx
      if (firstEl) firstCenter = firstEl.offsetLeft + firstEl.clientWidth / 2
      if (lastEl) lastCenter = lastEl.offsetLeft + lastEl.clientWidth / 2

      const startX = firstCenter - s
      const endX = lastCenter - s
      const visibleLeft = clamp(startX, 0, vw)
      const visibleRight = clamp(endX, 0, vw)
      setLineLeft(visibleLeft)
      setLineWidth(Math.max(0, visibleRight - visibleLeft))

      const totalRange = Math.max(0, lastCenter - firstCenter)
      const lit = clamp(s, 0, totalRange)
      setProgressLeftW(lit)

      if (!didInitRef.current && firstEl) {
        didInitRef.current = true
        scroller.scrollLeft = 0
        setActive(0)
        requestAnimationFrame(computeLayout)
      }

      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false
        const anchorXScreen = getAnchorXScreen()
        const nearest = getNearestByAnchor(panelsRef.current, anchorXScreen)
        maybeSetActive(nearest, anchorXScreen)
      }, 80)

      setSweepY(Math.max(120, Math.round(vh * 0.44)))
    }

    const onScroll = () => {
      computeLayout()
      if (!isAutoScrollingRef.current) resetInactivityTimer()
    }

    const scroller = scrollerRef.current
    computeLayout()
    scroller?.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", computeLayout)
    window.addEventListener("orientationchange", computeLayout)
    return () => {
      scroller?.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", computeLayout)
      window.removeEventListener("orientationchange", computeLayout)
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    }
  }, [cardWidth, overlapPx, anchorXRatio, anchorYRatio, items.length, reversed])

  // start/cleanup timers
  useEffect(() => {
    resetInactivityTimer()
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (sweepTO2.current) clearTimeout(sweepTO2.current)
    }
  }, [])

  // keyboard nav (⇦/⇨ reversed when mirrored)
  useEffect(() => {
  if (!isIntersecting) return

  const dirFactor = reversed ? -1 : 1
  const onKey = e => {
    if (isSweeping) return
    const k = e.key

    if (k === 'ArrowRight' || k === 'PageDown') {
      e.preventDefault()
      resetInactivityTimer()
      go(+1 * dirFactor)
      return
    }

    if (k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault()
      resetInactivityTimer()
      go(-1 * dirFactor)
      return
    }
  }

  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [
  active,
  displayItems,
  order,
  isSweeping,
  reversed,
  isIntersecting,
  flipped,
  dismissedFlipHint
])

  // wheel/touch → discrete steps (directions reversed when mirrored)
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || !isIntersecting) return // Only add listeners when visible

    const dirFactor = reversed ? -1 : 1

    const onTouchStart = e => {
      if (isSweeping || e.touches.length !== 1) return
      touchActiveRef.current = true
      touchStartXRef.current = e.touches[0].clientX
      touchDeltaXRef.current = 0
    }
    const onTouchMove = e => {
      if (!touchActiveRef.current) return
      e.preventDefault()
      const x = e.touches[0].clientX
      touchDeltaXRef.current = x - touchStartXRef.current
    }
    const onTouchEnd = () => {
      if (!touchActiveRef.current) return
      touchActiveRef.current = false
      const dx = touchDeltaXRef.current
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        const dir = (dx < 0 ? +1 : -1) * dirFactor
        resetInactivityTimer(); go(dir)
      } else snapToNearest()
    }

    scroller.addEventListener("touchstart", onTouchStart, { passive: true })
    scroller.addEventListener("touchmove", onTouchMove, { passive: false })
    scroller.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      scroller.removeEventListener("touchstart", onTouchStart)
      scroller.removeEventListener("touchmove", onTouchMove)
      scroller.removeEventListener("touchend", onTouchEnd)
    }
  }, [isSweeping, dotLeft, reversed, isIntersecting])

  // navigation helpers (use screen-space anchor for rect comparisons)
  function go(delta) {
    const current = getNearestByAnchor(panelsRef.current, getAnchorXScreen())
    const next = clamp(current + delta, 0, displayItems.length - 1)
    if (next === current) return

    const movedIndexRight = next > current
    const movedVisualRight = reversed ? !movedIndexRight : movedIndexRight
    if (movedVisualRight) setDismissedRightHint(true)
    else setDismissedLeftHint(true)

    goToIndex(next)
  }

  function snapToNearest() {
    if (isSweeping) return
    const idx = getNearestByAnchor(panelsRef.current, getAnchorXScreen())
    goToIndex(idx)
  }
  function goToIndex(index) {
    const scroller = scrollerRef.current
    const el = panelsRef.current[index]
    if (!scroller || !el) return
    // Scroll math remains in DOM space (pre-transform)
    const target = el.offsetLeft + el.clientWidth / 2 - dotLeft
    isAutoScrollingRef.current = true
    scroller.scrollTo({ left: target, behavior: "smooth" })
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false
      setActive(index)
    }, 420)
  }

  // active selection
  function maybeSetActive(proposedIdx, anchorXScreen) {
    const currentEl = panelsRef.current[active]
    const proposedEl = panelsRef.current[proposedIdx]
    if (!proposedEl) return setActive(proposedIdx)
    const dP = Math.abs(elCenterToAnchor(proposedEl, anchorXScreen))
    const dC = currentEl ? Math.abs(elCenterToAnchor(currentEl, anchorXScreen)) : Infinity
    const hysteresisPx = (window.innerWidth / 2) * HYSTERESIS_RATIO
    if (dP + hysteresisPx < dC) setActive(proposedIdx)
  }
  function isInSoftZone(i) {
    const el = panelsRef.current[i]
    if (!el) return i === active
    return Math.abs(elCenterToAnchor(el, getAnchorXScreen())) <= (window.innerWidth / 2) * SOFT_ZONE_RATIO
  }

  // click/flip
  function onCardClick(displayIndex, it, inZone) {
  if (isSweeping) return

  // Clicking another card to navigate: dismiss the arrow hint in the moved direction
  if (!inZone) {
    const current = getNearestByAnchor(panelsRef.current, getAnchorXScreen())
    const movedIndexRight = displayIndex > current
    const movedVisualRight = reversed ? !movedIndexRight : movedIndexRight
    if (movedVisualRight) setDismissedRightHint(true)
    else setDismissedLeftHint(true)

    goToIndex(displayIndex)
    resetInactivityTimer()
    return
  }

  // In-zone click = flip; dismiss the flip hint on first successful flip
  
  const key = keyFor(order[displayIndex], it)
  const nextFlip = !flipped[key]
  if (nextFlip && !dismissedFlipHint) setDismissedFlipHint(true)
  setFlipped(s => ({ ...s, [key]: nextFlip }))
  
}

  // idle sweep
  function resetInactivityTimer() {
    if (isSweeping) return
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    inactivityTimerRef.current = setTimeout(onIdleSweep, IDLE_MS)
  }
  function onIdleSweep() {
    if (isSweeping) return
    const els = panelsRef.current
    if (!els || !els.length) { resetInactivityTimer(); return }

    const anchorXScreen = getAnchorXScreen()

    const movingDisplayIdx = []
    const keepDisplayIdx = []
    els.forEach((el, di) => {
      if (!el) return
      const d = elCenterToAnchor(el, anchorXScreen)
      const isMoving = reversed ? d > 2 : d < -2   // RIGHT of dot when reversed, LEFT when normal
      if (isMoving) movingDisplayIdx.push(di)
      else keepDisplayIdx.push(di)
    })
    if (!movingDisplayIdx.length) { resetInactivityTimer(); return }

    // hide DOM-left during sweep (mirroring handles visual side)
    setShowLeftTimeline(false)

    const movingOriginalIdx = movingDisplayIdx.map(di => order[di])
    const movingKeys = movingOriginalIdx.map(oi => keyFor(oi, items[oi]))
    setSweepKeys(movingKeys)

    const frozen = new Map()
    displayItems.forEach((it, di) => {
      const oi = order[di]
      const k = keyFor(oi, items[oi])
      frozen.set(k, isInSoftZone(di))
    })
    frozenInZoneRef.current = frozen

    setIsSweeping(true)
    setSweepPhase("up")

    // choose anchor: boundary card that remains (first kept on right in normal; last kept on left in reversed)
    let anchorDisplayIdx = null
    if (keepDisplayIdx.length) {
      anchorDisplayIdx = reversed ? Math.max(...keepDisplayIdx) : Math.min(...keepDisplayIdx)
    }

    if (sweepTO2.current) clearTimeout(sweepTO2.current)
    sweepTO2.current = setTimeout(() => {
      const scroller = scrollerRef.current
      if (!scroller) return

      let anchorOriginalIdx = null
      let beforeCenterX = null
      if (anchorDisplayIdx != null) {
        anchorOriginalIdx = order[anchorDisplayIdx]
        const anchorEl = panelsRef.current[anchorDisplayIdx]
        if (anchorEl) {
          const r = anchorEl.getBoundingClientRect()
          beforeCenterX = r.left + r.width / 2
        }
      }

      const keepOriginalIdx = order.filter((oi, di) => !movingDisplayIdx.includes(di))
      const newOrder = [...keepOriginalIdx, ...movingOriginalIdx]
      setOrder(newOrder)

      requestAnimationFrame(() => {
        if (anchorOriginalIdx != null && beforeCenterX != null) {
          // Always animate DOM-right; mirror makes it visual-left when reversed
          setAnimateRightGrow(true)

          const newDisplayIdx = newOrder.indexOf(anchorOriginalIdx)
          const newAnchorEl = panelsRef.current[newDisplayIdx]
          if (newAnchorEl) {
            const r2 = newAnchorEl.getBoundingClientRect()
            const afterCenterX = r2.left + r2.width / 2
            const scrollAdjust = afterCenterX - beforeCenterX
            scroller.scrollLeft += reversed ? -scrollAdjust : scrollAdjust
          }
        }

        setSweepKeys([])
        setSweepPhase("idle")
        setIsSweeping(false)
        frozenInZoneRef.current.clear()

        const nearest = getNearestByAnchor(panelsRef.current, getAnchorXScreen())
        setActive(nearest)

        setTimeout(() => setShowLeftTimeline(true), 120)
        setTimeout(() => setAnimateRightGrow(false), GROW_MS + 40)

        resetInactivityTimer()
      })
    }, SWEEP_UP_MS + 60)
  }

  // progress + baseline segments (DOM-space; visuals are mirrored by CSS)
  const visibleProgressLeft = Math.max(0, dotLeft - progressLeftW)
  const visibleProgressWidth = Math.max(0, Math.min(progressLeftW, dotLeft - lineLeft))
  const baselineStart = lineLeft
  const baselineEnd = lineLeft + lineWidth
  const leftBaselineLeft = baselineStart
  const leftBaselineWidth = Math.max(0, Math.min(dotLeft, baselineEnd) - baselineStart)
  const rightBaselineLeft = Math.max(dotLeft, baselineStart)
  const rightBaselineWidth = Math.max(0, baselineEnd - rightBaselineLeft)

  // DOM-side visibility during sweep
  const showDomLeft = showLeftTimeline     // hide DOM-left while sweeping
  const showDomRight = true                // keep DOM-right visible

  const NameWithBreak = ({ name, limit = 20 }) => {
  const value = (name ?? "Unnamed").trim();
  if (value.length <= limit) return <>{value}</>;

  const cutAt = (() => {
    const i = value.lastIndexOf(" ", limit);
    return i >= 0 ? i : limit;
  })();

  const first = value.slice(0, cutAt);
  const second = value.slice(cutAt + (value[cutAt] === " " ? 1 : 0));

  return (
    <>
      {first}
      <br />
      {second}
    </>
  );
};

  return (
    <section ref={sectionRef} className={`relative w-full ${className}`} aria-label="CardFlip Horizontal">
      {/* timeline overlay (mirrored visually when reversed) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: reversed ? "scaleX(-1)" : "none", transformOrigin: "center" }}
      >
        <div className="sticky top-0 h-[100svh] w-full">
          {/* right baseline */}
          {rightBaselineWidth > 0 && (
            <div
              className="absolute bg-[#374151]"
              style={{
                left: rightBaselineLeft,
                bottom: dotBottom,
                width: rightBaselineWidth,
                height: "1.25px",
                opacity: showDomRight ? 1 : 0,
                transition: `${animateRightGrow ? `width ${GROW_MS}ms ease-out, ` : ""}opacity ${FADE_MS}ms linear`,
              }}
              aria-hidden
            />
          )}
          {/* left baseline */}
          {leftBaselineWidth > 0 && (
            <div
              className="absolute bg-[#374151]"
              style={{
                left: leftBaselineLeft,
                bottom: dotBottom,
                width: leftBaselineWidth,
                height: "1.25px",
                opacity: showDomLeft ? 1 : 0,
                transition: `opacity ${FADE_MS}ms linear`,
              }}
              aria-hidden
            />
          )}
          {/* progress (DOM-left segment; mirror handles visuals) */}
          {showLeftTimeline && visibleProgressWidth > 0 && (
            <div
              className="absolute"
              style={{
                left: visibleProgressLeft,
                bottom: dotBottom,
                width: visibleProgressWidth,
                height: "1.25px",
                background: progColor,
                boxShadow: `0 0 10px ${hexToRgba(progColor, 0.55)}`,
                opacity: showLeftTimeline ? 1 : 0,
                transition: `opacity ${FADE_MS}ms linear`
              }}
              aria-hidden
            />
          )}
          <div
            className="absolute -translate-x-1/2 translate-y-1/2"
            style={{ left: dotLeft, bottom: dotBottom, width: dotSize, height: dotSize }}
            aria-hidden
          >
            <div className="absolute -inset-2 rounded-full blur-md opacity-70 animate-pulse pointer-events-none z-10" style={{ backgroundColor: color }} />
            <div className="absolute inset-0 rounded-full shadow-[0_0_6px_1px_rgba(0,0,0,0.25)] z-20" style={{ backgroundColor: color }} />
          </div>
        </div>
      </div>

      {/* scroller (mirrored visually when reversed) */}
      <div
  ref={scrollerRef}
  role="list"
  className="h-[100svh] w-full overflow-x-hidden overflow-y-hidden flex items-stretch"
        style={{
          transform: reversed ? "scaleX(-1)" : "none",
          transformOrigin: "center",
          scrollSnapType: "none",
          overscrollBehavior: "contain",
          scrollPaddingLeft: dotLeft,
          scrollPaddingRight: `calc(100vw - ${dotLeft}px)`,
          pointerEvents: isSweeping ? "none" : "auto",
        }}
      >
        <div className="flex-shrink-0 h-full" aria-hidden style={{ width: startPad }} />
        {displayItems.map((it, di) => {
          const originalIndex = order[di]
          const key = keyFor(originalIndex, it)

          const inZoneRuntime = isInSoftZone(di)
          const frozenInZone = isSweeping ? frozenInZoneRef.current.get(key) : undefined
          const appearInZone = isSweeping ? (frozenInZone ?? inZoneRuntime) : inZoneRuntime

          const isFlipped = !!flipped[key]
          const stackIndex = appearInZone ? displayItems.length + 1 : displayItems.length - di
          const scale = appearInZone ? FOCUS_SCALE : UNFOCUS_SCALE
          const emphasisShadow = appearInZone ? "0 28px 60px rgba(0,0,0,0.6)" : "0 10px 20px rgba(0,0,0,0.35)"

          const isMoving = isSweeping && sweepKeys.includes(key)
          const isMovingNow = isMoving && sweepPhase !== "idle"

          const hasBackImage = !!it.backImage?.src

          let sweepTransform = "translate3d(0,0,0)"
          let sweepOpacity = 1
          let sweepTransition = `transform ${SWEEP_UP_MS}ms ease-out, opacity ${FADE_MS}ms ease-out`
          if (isMoving && sweepPhase === "up") {
            sweepTransform = `translate3d(0, ${-sweepY}px, 0)`
            sweepOpacity = 0.02
          }
          const handleFlipTap = (e) => {
            if (!appearInZone) return;
            const t = e.target;
            // ignore taps on real interactive elements or explicit opt-outs
            if (t && t.closest && t.closest('a,button,input,textarea,select,[role="button"],[data-no-flip]')) return;
            onCardClick(di, it, appearInZone);
          }


          return (
            <article
              key={key}
              ref={el => (panelsRef.current[di] = el)}
              role="listitem"
              className="shrink-0 h-full relative"
              style={{ width: articleW, zIndex: stackIndex, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              onClick={handleFlipTap}
              onTouchEnd={handleFlipTap}
            >
              {/* card (un-mirror the content so text/images look normal) */}
              <div
                className="absolute -translate-x-1/2 will-change-transform"
                style={{
                  left: "50%",
                  bottom: dotBottom + GAP_PX,
                  transform: sweepTransform + (reversed ? " scaleX(-1)" : ""),
                  opacity: sweepOpacity,
                  transition: sweepTransition,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isFlipped && appearInZone}
                  onClick={(e) => { e.stopPropagation(); onCardClick(di, it, appearInZone) }}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && onCardClick(di, it, appearInZone)}
                  className={`group relative rounded-2xl overflow-hidden select-none ${appearInZone ? "cursor-pointer" : "cursor-default"}`}
                  style={{
                    width: computedCardW,
                    height: computedCardH,
                    perspective: "1200px",
                    backgroundColor: "transparent",
                    contain: "paint"
                  }}
                >
                  <div
                    className="h-full w-full transition-transform duration-200"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: `scale(${scale})`,
                      boxShadow: emphasisShadow,
                      backgroundColor: "transparent",
                      borderRadius: "1rem",
                      backfaceVisibility: "hidden"
                    }}
                  >
                    <div
                      className="relative h-full w-full transition-transform duration-500"
                      style={{ transformStyle: "preserve-3d", transform: isFlipped && appearInZone ? "rotateY(180deg)" : "rotateY(0deg)" }}
                    >
                      {/* front */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backfaceVisibility: "hidden",
                          borderRadius: "1rem",
                          overflow: "hidden",
                          opacity: appearInZone ? 1 : 0.4,
                          filter: appearInZone ? "none" : "brightness(0.3) contrast(0.88)",
                          backgroundColor: "#0c1a22",
                        }}
                      >
                        {it.photo?.src ? (
                          <img src={it.photo.src} alt={it.photo.alt || `${it.name} portrait`} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-white/60">No Photo</div>
                        )}
                      </div>

                      {/* back */}
<div
  className="absolute inset-0"
  style={{
    transform: "rotateY(180deg)",
    backfaceVisibility: "hidden",
    borderRadius: "1rem",
    backgroundColor: hexToRgba("#0c1a22", appearInZone ? 0.92 : 0.12),
    opacity: appearInZone ? 1 : 0.4,
    filter: appearInZone ? "none" : "brightness(0.3) contrast(0.88)",
  }}
>
  <div
    className={
      hasBackImage
        // with picture: add a bit more top padding + larger gap to push text down
        ? "px-4 pt-10 sm:pt-10 pb-20 h-full w-full flex flex-col items-center justify-start text-center gap-4 md:gap-5"
        // no picture: keep original centering/spacing exactly the same
        : "px-4 pt-4 pb-20 h-full w-full flex items-center justify-center text-center"
    }
    style={{ opacity: isMovingNow ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
  >
    {hasBackImage ? (
      <div className="w-28 sm:w-32 md:w-36 aspect-square overflow-hidden rounded-md">
        <img
          src={it.backImage.src}
          alt={it.backImage.alt || `${it.name} graphic`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    ) : null}

    <p className={hasBackImage
      ? "mt-2 sm:mt-3 text-sm sm:text-base md:text-lg leading-relaxed text-[#e0e0e0]"
      : "text-sm sm:text-base md:text-lg leading-snug text-[#e0e0e0]"
    }>
      {it.mobileDescription || "No description provided."}
    </p>
  </div>

  {(it.linkedin || it.email) && (
    <div
      className="absolute left-0 right-0 flex items-center justify-center gap-3"
      style={{ bottom: ICONS_HB }}
    >
      {it.linkedin ? (
        <a
          href={it.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${it.name} LinkedIn`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
        >
          <Linkedin size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
      ) : null}

      {it.email ? (
        <a
          href={`mailto:${it.email}`}
          aria-label={`Email ${it.name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white"
        >
          <Mail size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
      ) : null}
    </div>
  )}
</div>

                    </div>
                  </div>
                  {appearInZone && !isMovingNow && (
                    <div className="absolute inset-0 z-50 pointer-events-none">
                      {(() => {
                        // Forward navigation always means index+1 (go(1)) if available
                        const hasForwardIndex = active < displayItems.length - 1
                        const forwardDismissed = reversed ? dismissedLeftHint : dismissedRightHint

                        // Place the forward arrow at the visual edge: right (normal) or left (reversed)
                        const edgePos = reversed
                          ? "left-1 sm:left-1.5 md:left-2"
                          : "right-1 sm:right-1.5 md:right-2"

                        if (hasForwardIndex && !forwardDismissed) {
                          return (
<div
  className={`group/arrow pointer-events-auto absolute top-1/2 -translate-y-1/2 ${edgePos} opacity-95 transition-opacity duration-300`}
  style={{ filter: "drop-shadow(0 0 8px rgba(248,218,156,0.35))" }}
  onPointerDownCapture={e => e.stopPropagation()}
  aria-hidden
>
  {/* wrapper handles horizontal bounce so vertical centering isn't affected */}
  <div
    className="pointer-events-none"
    style={{
      animation: "cardflip-nudge-x 1.4s ease-in-out infinite",
      ...(reversed ? { ["--nudge-amp"]: "-5px" } : { ["--nudge-amp"]: "5px" }),
    }}
  >
    {reversed
      ? <ChevronLeft className="w-7 h-7 text-[#f8da9c]" strokeWidth={2.5} />
      : <ChevronRight className="w-7 h-7 text-[#f8da9c]" strokeWidth={2.5} />
    }
  </div>

  {/* Tooltip in the same style as the flip hint */}
  <div
    className={`absolute top-8 ${reversed ? "left-0" : "right-0"} px-2 py-1 rounded bg-black/70 text-[#f8da9c] text-[10px] leading-tight whitespace-nowrap
      opacity-0 transition-opacity duration-200 pointer-events-none group-hover/arrow:opacity-100`}
  >
    Click or use arrow keys
  </div>
</div>
                          )
                        }
                        return null
                      })()}

                      {/* Redo / Flip hint with tooltip (hover the icon) */}
                      {(
                        <div
                          className="group/redo pointer-events-auto absolute right-2 top-2 z-[60]"
                          onPointerDownCapture={e => e.stopPropagation()}
                          onClick={() => onCardClick(di, it, true)}
                          aria-hidden
                          style={{ filter: "drop-shadow(0 0 8px rgba(248,218,156,0.35))" }}
                        >
                          <RotateCw className="w-6 h-6 text-[#f8da9c]" strokeWidth={2} />
                          <div
                            className="absolute top-7 right-0 px-2 py-1 rounded bg-black/70 text-[#f8da9c] text-[10px] leading-tight whitespace-nowrap
                     opacity-0 transition-opacity duration-200 pointer-events-none group-hover/redo:opacity-100"
                          >
                            Tap to Flip
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                </div>
              </div>

              {/* labels (un-mirror text) */}
              <div
  className="absolute -translate-x-1/2 text-center transition-opacity"
  style={{
    left: "50%",
    top: dotTop + GAP_PX,
    maxWidth: "min(80vw, 560px)",
    opacity: isMovingNow ? 0 : 1,
    pointerEvents: isMovingNow ? "none" : "auto",
    transition: `opacity ${isSweeping ? FADE_MS : FADE_MS + 1000}ms ease`,
    transform: reversed ? "scaleX(-1)" : "none",
  }}
>
  {(appearInZone || !isCrowded) && (
    <div
      className="font-bahnschrift overflow-hidden transition-colors break-words"
      style={{
        color: appearInZone ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
        fontSize: "clamp(1.05rem, 2.2vw, 1.9rem)",
        lineHeight: 1.1,
      }}
    >
      <NameWithBreak name={it.name} limit={20} />
    </div>
  )}

  {appearInZone ? (
    <div
      className="mt-1"
      style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)", lineHeight: 1.15 }}
    >
      {it.title || ""}
    </div>
  ) : null}
</div>
            </article>
          )
        })}
        <div className="flex-shrink-0 h-full" aria-hidden style={{ width: endPad }} />
      </div>
    </section>
  )
}

/* helpers */
const CARD_RATIO = 7 / 5
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
function elCenterToAnchor(el, anchorXScreen) { const r = el.getBoundingClientRect(); return (r.left + r.width / 2) - anchorXScreen }
function getNearestByAnchor(els, anchorXScreen) {
  let best = 0, bestDist = Infinity
  els.forEach((el, i) => {
    if (!el) return
    const d = Math.abs(elCenterToAnchor(el, anchorXScreen))
    if (d < bestDist) { bestDist = d; best = i }
  })
  return best
}
function hexToRgba(hex, a = 1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return `rgba(64,213,209,${a})`
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${a})`
}
function computeCardWidth(vw, preferred) {
  const gutter = 32, lineThickness = 2
  const maxTwoCol = Math.max(220, (vw / 2) - gutter - lineThickness)
  const maxOneCol = Math.max(220, vw - (gutter * 2))
  return Math.round(vw < 640 ? Math.min(preferred, maxOneCol) : Math.min(preferred, maxTwoCol))
}