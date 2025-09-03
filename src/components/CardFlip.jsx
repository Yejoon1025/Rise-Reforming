// src/components/CardFlip.jsx
// -----------------------------------------------------------------------------
// CardFlip — Horizontal, scrollable "stack of cards" that flip in place.
// - Cards slide horizontally while a sticky timeline + focus dot stay fixed.
// - Only the card nearest the focus axis (“dot”) is interactable & flips.
// - Progress line lights up to the LEFT of the dot.
// - First and last timeline segments are clamped to the centers of the first
//   and last cards respectively (no extra line before/after).
// - Keyboard:
//     • ← / PageUp  : previous card
//     • → / PageDown: next card
//     • Enter/Space : flip focused card (front/back)
// - Accessibility: list semantics, button role on the flip surface.
//
// Layout overview
// -----------------------------------------------------------------------------
// <section> (relative)
//   ├─ Sticky overlay (timeline + dot)
//   └─ Horizontal scroller (cards)
//       ├─ start spacer (so first card can align to dot axis)
//       ├─ <article>… (one per item)
//       └─ end spacer (so last card can align to dot axis)
//
// Sizing
// -----------------------------------------------------------------------------
// - Cards keep 5:7 (W:H=5:7) ratio
// - computedCardW/H: responsive width/height based on viewport
// - articleW: the column width each card occupies; overlapPx reduces articleW,
//   giving the “fanned” overlap between columns.
//
// Notes
// -----------------------------------------------------------------------------
// - The focus axis X (dotLeft) is computed from anchorXRatio, clamped to left half.
// - startPad / endPad pad the scroller so first/last card centers can sit on the axis.
// - scrollPaddingRight ensures the last card can reach the dot (prevents snap-back).
// - Hysteresis smooths active card changes; Soft Zone controls when a card is
//   treated as “in focus” (scales, brightens, clickable).
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, useLayoutEffect } from "react"

export function CardFlip({
  items = [],                 // [{ id, name, title, photo:{src,alt}, description, linkedin?, email? }]
  color = "#3ca6a6",          // focus dot color (and default progressColor)
  progressColor,              // optional override for progress line color
  dotSize = 12,               // px
  cardWidth = 320,            // preferred playing-card width (height = width * 7/5)
  overlapPx = 64,             // horizontal overlap between adjacent articles (columns)
  anchorXRatio = 0.28,        // focus-axis X as a ratio of viewport width (clamped to left half)
  anchorYRatio = 1 / 3,       // focus-axis Y as a ratio of viewport height (from bottom)
  className = "",
}) {
  // Refs to DOM nodes
  const sectionRef = useRef(null)
  const scrollerRef = useRef(null)
  const panelsRef = useRef([]) // <article> refs by index

  // Active state (index of card nearest the focus axis)
  const [active, setActive] = useState(0)

  // Card + column sizing (responsive)
  const [computedCardW, setComputedCardW] = useState(cardWidth)
  const [computedCardH, setComputedCardH] = useState(Math.round(cardWidth * CARD_RATIO))
  const [articleW, setArticleW] = useState(Math.max(220, cardWidth - overlapPx))

  // Horizontal spacers so the first/last card centers can sit on the focus axis
  const [startPad, setStartPad] = useState(0)
  const [endPad, setEndPad] = useState(0)

  // Per-card flip state (only the focused card responds)
  const [flipped, setFlipped] = useState({})   // { [key]: boolean }

  // Focus dot position (in px)
  const [dotLeft, setDotLeft] = useState(0)
  const [dotBottom, setDotBottom] = useState(0)
  const [dotTop, setDotTop] = useState(0)

  // Timeline geometry (visible baseline and progress left-of-dot)
  const [lineLeft, setLineLeft] = useState(0)
  const [lineWidth, setLineWidth] = useState(0)
  const [progressLeftW, setProgressLeftW] = useState(0)

  // Internal control flags & timers
  const isAutoScrollingRef = useRef(false)
  const scrollIdleTimerRef = useRef(null)
  const didInitRef = useRef(false)

  // Tunables
  const HYSTERESIS_RATIO = 0.22     // more = stickier active card changes
  const SOFT_ZONE_RATIO = 0.28      // more = wider “focused” zone
  const progColor = progressColor || color
  const GAP_PX = 16                 // gap between dot axis and card/name stacks
  const FOCUS_SCALE = 1.14          // scale for focused card
  const UNFOCUS_SCALE = 0.9         // scale for non-focused cards
  const ICONS_HB = 40               // icon bar vertical offset into the textbox
  const keyFor = (i, it) => it.id ?? i

  // ---------------------------------------------------------------------------
  // Preload all photos to reduce on-demand loading flickers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const links = []
    items.forEach(it => {
      const src = it.photo?.src
      if (!src) return
      const link = document.createElement("link")
      link.rel = "preload"
      link.as = "image"
      link.href = src
      document.head.appendChild(link)
      links.push(link)
    })
    return () => links.forEach(l => l.parentNode?.removeChild(l))
  }, [items])

  // ---------------------------------------------------------------------------
  // Ensure we start scrolled fully left before first paint to avoid misalignment
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollLeft = 0
  }, [])

  // ---------------------------------------------------------------------------
  // Core layout pass: compute dot position, card sizes, spacers, timeline geometry.
  // Runs on scroll & resize. Also does active-card selection with hysteresis.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    function onScrollOrResize() {
      const scroller = scrollerRef.current
      if (!scroller) return

      const vw = window.innerWidth || 0
      const vh = window.innerHeight || 0
      if (!vw || !vh) return

      // --- Focus axis (dot) position from ratios (clamped) ---
      const leftPx = Math.round(vw * clamp(anchorXRatio, 0.05, 0.5)) // keep on left half
      const bottomPx = Math.round(vh * clamp(anchorYRatio, 0.15, 0.85))
      const topPx = vh - bottomPx
      setDotLeft(leftPx)
      setDotBottom(bottomPx)
      setDotTop(topPx)

      // --- Card sizing (5:7) + article (column) width ---
      const cw = computeCardWidth(vw, cardWidth)
      const ch = Math.round(cw * CARD_RATIO)
      const aw = Math.max(220, cw - overlapPx)
      setComputedCardW(cw)
      setComputedCardH(ch)
      setArticleW(aw)

      // --- Scroller spacers so first/last centers can align to the dot axis ---
      setStartPad(Math.max(0, leftPx - aw / 2))
      setEndPad(Math.max(0, Math.ceil((vw - leftPx) - aw / 2) + 4))

      // --- Timeline: clamp to first/last card centers in viewport coords ---
      const firstEl = panelsRef.current[0]
      const lastEl = panelsRef.current[items.length - 1]
      const s = scroller.scrollLeft

      let firstCenter = leftPx
      let lastCenter = leftPx
      if (firstEl) firstCenter = firstEl.offsetLeft + firstEl.clientWidth / 2
      if (lastEl) lastCenter = lastEl.offsetLeft + lastEl.clientWidth / 2

      // Project first/last centers into viewport X by subtracting scrollLeft
      const startX = firstCenter - s
      const endX = lastCenter - s

      // Clamp visible baseline to viewport
      const visibleLeft = clamp(startX, 0, vw)
      const visibleRight = clamp(endX, 0, vw)
      setLineLeft(visibleLeft)
      setLineWidth(Math.max(0, visibleRight - visibleLeft))

      // --- Progress lights up to the LEFT of the dot ---
      // Compute total range between first/last center in scroller coords,
      // then light proportionally to scrollLeft.
      const range = Math.max(0, lastCenter - firstCenter)
      const lit = clamp(s, 0, range)
      setProgressLeftW(lit)

      // --- Initial alignment on very first pass ---
      if (!didInitRef.current && firstEl) {
        didInitRef.current = true
        scroller.scrollLeft = 0 // aligns first card center with dot axis (via startPad)
        setActive(0)
        // Run a second pass after programmatic scroll so geometry is current
        requestAnimationFrame(onScrollOrResize)
      }

      // --- Debounced active-card selection using hysteresis ---
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false
        const nearest = getNearestByAnchor(panelsRef.current, leftPx)
        maybeSetActive(nearest, leftPx)
      }, 80)
    }

    onScrollOrResize()
    const scroller = scrollerRef.current
    scroller?.addEventListener("scroll", onScrollOrResize, { passive: true })
    window.addEventListener("resize", onScrollOrResize)
    window.addEventListener("orientationchange", onScrollOrResize)
    return () => {
      scroller?.removeEventListener("scroll", onScrollOrResize)
      window.removeEventListener("resize", onScrollOrResize)
      window.removeEventListener("orientationchange", onScrollOrResize)
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    }
  }, [cardWidth, overlapPx, anchorXRatio, anchorYRatio, items.length])

  // ---------------------------------------------------------------------------
  // Global keyboard controls (only if section is on-screen)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKey = e => {
      const k = e.key
      const rect = sectionRef.current?.getBoundingClientRect()
      const inViewport = rect && rect.left < window.innerWidth && rect.right > 0
      if (!inViewport) return

      // Navigation
      if (k === "ArrowRight" || k === "PageDown" || k === "ArrowLeft" || k === "PageUp") {
        e.preventDefault()
        if (isAutoScrollingRef.current) return
        return go(k === "ArrowLeft" || k === "PageUp" ? -1 : 1)
      }

      // Flip current (only affects focused card)
      if (k === "Enter" || k === " ") {
        const idx = active
        const it = items[idx]
        if (!it) return
        e.preventDefault()
        const key = keyFor(idx, it)
        setFlipped(s => ({ ...s, [key]: !s[key] }))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items.length, active])

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------
  function go(delta) {
    // Pick the true nearest in case active is slightly behind
    const current = getNearestByAnchor(panelsRef.current, dotLeft)
    const next = clamp(current + delta, 0, items.length - 1)
    if (next === current) return
    goToIndex(next)
  }

  function goToIndex(index) {
    const scroller = scrollerRef.current
    const el = panelsRef.current[index]
    if (!scroller || !el) return

    // Align the article center to the focus axis (dotLeft)
    const target = el.offsetLeft + el.clientWidth / 2 - dotLeft
    isAutoScrollingRef.current = true
    scroller.scrollTo({ left: target, behavior: "smooth" })

    // Snap active after the smooth scroll finishes
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false
      setActive(index)
    }, 420)
  }

  // Hysteresis: only accept a new active if it’s sufficiently closer than the current
  function maybeSetActive(proposedIdx, anchorX) {
    const currentEl = panelsRef.current[active]
    const proposedEl = panelsRef.current[proposedIdx]
    if (!proposedEl) return setActive(proposedIdx)

    const dProposed = Math.abs(elCenterToAnchor(proposedEl, anchorX))
    const dCurrent = currentEl ? Math.abs(elCenterToAnchor(currentEl, anchorX)) : Infinity
    const hysteresisPx = (window.innerWidth / 2) * HYSTERESIS_RATIO
    if (dProposed + hysteresisPx < dCurrent) setActive(proposedIdx)
  }

  // Soft focus zone controls card emphasis/opacity/clickability
  function isInSoftZone(i) {
    const el = panelsRef.current[i]
    if (!el) return i === active
    return Math.abs(elCenterToAnchor(el, dotLeft)) <= (window.innerWidth / 2) * SOFT_ZONE_RATIO
  }

  // ---------------------------------------------------------------------------
  // Flip handling: clicking a non-focused card recenters first; focused flips.
  // ---------------------------------------------------------------------------
  function onCardClick(i, it, inZone) {
    if (!inZone) {
      goToIndex(i)
      return
    }
    const key = keyFor(i, it)
    setFlipped(s => ({ ...s, [key]: !s[key] }))
  }

  // Visible progress should not exceed visible baseline left-of-dot
  const visibleProgressLeft = Math.max(0, dotLeft - progressLeftW)
  const visibleProgressWidth = Math.max(0, Math.min(progressLeftW, dotLeft - lineLeft))

  return (
    <section
      ref={sectionRef}
      className={`relative w-full ${className}`}
      aria-label="CardFlip Horizontal"
    >
      {/* --------------------------------------------------------------------
          Sticky overlay: baseline (clamped to first/last centers) + progress + dot
         -------------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full">
          {/* Baseline */}
          <div
            className="absolute bg-[#374151]"
            style={{ left: lineLeft, bottom: dotBottom, width: lineWidth, height: "1.25px" }}
            aria-hidden
          />
          {/* Cyan progress — lights up to the LEFT of the dot */}
          <div
            className="absolute"
            style={{
              left: visibleProgressLeft,
              bottom: dotBottom,
              width: visibleProgressWidth,
              height: "1.25px",
              background: progColor,
              boxShadow: `0 0 10px ${hexToRgba(progColor, 0.55)}`,
            }}
            aria-hidden
          />
          {/* Focus dot with glow */}
          <div
            className="absolute -translate-x-1/2 translate-y-1/2"
            style={{ left: dotLeft, bottom: dotBottom, width: dotSize, height: dotSize }}
            aria-hidden
          >
            <div
              className="absolute -inset-2 rounded-full blur-md opacity-70 animate-pulse pointer-events-none z-10"
              style={{ backgroundColor: color }}
            />
            <div
              className="absolute inset-0 rounded-full shadow-[0_0_6px_1px_rgba(0,0,0,0.25)] z-20"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          Horizontal scroller (snap + custom scroll padding so last card can align)
         -------------------------------------------------------------------- */}
      <div
        ref={scrollerRef}
        role="list"
        className="h-screen w-full overflow-x-auto overflow-y-hidden flex items-stretch"
        style={{
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: dotLeft,
          // IMPORTANT: allows the last card to reach the dot instead of snapping back
          scrollPaddingRight: `calc(100vw - ${dotLeft}px)`,
        }}
      >
        {/* Start spacer so the first card can align to the dot axis */}
        <div className="flex-shrink-0 h-full" aria-hidden style={{ width: startPad }} />

        {items.map((it, i) => {
          const inZone = isInSoftZone(i)
          const key = keyFor(i, it)
          const isFlipped = !!flipped[key]

          // Stack so cards to the LEFT appear ABOVE cards to the RIGHT (nicer overlap)
          const stackIndex = items.length - i

          // Emphasis styles based on focus
          const scale = inZone ? FOCUS_SCALE : UNFOCUS_SCALE
          const emphasisShadow = inZone
            ? "0 28px 60px rgba(0,0,0,0.6)"
            : "0 10px 20px rgba(0,0,0,0.35)"

          return (
            <article
              key={key}
              ref={el => (panelsRef.current[i] = el)}
              role="listitem"
              className="shrink-0 h-full relative snap-start"
              // scrollMarginLeft helps ensure centering math feels natural
              style={{ width: articleW, zIndex: stackIndex, scrollMarginLeft: articleW / 2 }}
            >
              {/* ----------------------- Card stack (aligned to dot axis) ----------------------- */}
              <div
                className="absolute -translate-x-1/2"
                style={{ left: "50%", bottom: dotBottom + GAP_PX }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isFlipped && inZone}
                  onClick={() => onCardClick(i, it, inZone)}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && onCardClick(i, it, inZone)}
                  className={`rounded-2xl overflow-hidden select-none ${inZone ? "cursor-pointer" : "cursor-default"}`}
                  style={{
                    width: computedCardW,
                    height: computedCardH,
                    perspective: "1200px", // for 3D flip
                  }}
                >
                  {/* Emphasis wrapper (scale & shadow). No hover tilt to keep it stable. */}
                  <div
                    className="h-full w-full transition-transform duration-200"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: `scale(${scale})`,
                      boxShadow: emphasisShadow,
                      willChange: "transform, box-shadow",
                    }}
                  >
                    {/* Flip inner: flips ONLY if focused (inZone) */}
                    <div
                      className="relative h-full w-full transition-transform duration-500"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped && inZone ? "rotateY(180deg)" : "rotateY(0deg)",
                        willChange: "transform",
                      }}
                    >
                      {/* FRONT: photo only */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backfaceVisibility: "hidden",
                          borderRadius: "1rem",
                          overflow: "hidden",
                          opacity: inZone ? 1 : 0.4,
                          filter: inZone ? "none" : "brightness(0.3) contrast(0.88)",
                          backgroundColor: "#0c1a22",
                        }}
                      >
                        {it.photo?.src ? (
                          <img
                            src={it.photo.src}
                            alt={it.photo.alt || `${it.name} portrait`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-white/60">
                            No Photo
                          </div>
                        )}
                      </div>

                      {/* BACK: centered text + action icons slightly higher into textbox */}
                      <div
                        className="absolute inset-0"
                        style={{
                          transform: "rotateY(180deg)",
                          backfaceVisibility: "hidden",
                          borderRadius: "1rem",
                          backgroundColor: hexToRgba("#0c1a22", inZone ? 0.92 : 0.12),
                          opacity: inZone ? 1 : 0.4,
                          filter: inZone ? "none" : "brightness(0.3) contrast(0.88)",
                        }}
                      >
                        {/* Description area, padded at bottom to clear icons */}
                        <div className="px-4 pt-4 pb-20 h-full w-full flex items-center justify-center text-center">
                          <p className="text-sm sm:text-base md:text-lg leading-snug text-[#e0e0e0]">
                            {it.description || "No description provided."}
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
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                              >
                                <LinkedInIcon />
                              </a>
                            ) : null}
                            {it.email ? (
                              <a
                                href={`mailto:${it.email}`}
                                aria-label={`Email ${it.name}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                              >
                                <MailIcon />
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------ Name (always) + Title (only when focused) ------------------ */}
              <div
                className="absolute -translate-x-1/2 text-center"
                style={{ left: "50%", top: dotTop + GAP_PX, maxWidth: "min(80vw, 560px)" }}
              >
                <div
                  className="font-bahnschrift whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{
                    color: inZone ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                    fontSize: "clamp(1.05rem, 2.2vw, 1.9rem)",
                    lineHeight: 1.1,
                  }}
                >
                  {it.name || "Unnamed"}
                </div>

                {inZone ? (
                  <div
                    className="mt-1"
                    style={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)",
                      lineHeight: 1.15,
                    }}
                  >
                    {it.title || ""}
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}

        {/* End spacer so the last card can align to the dot axis */}
        <div className="flex-shrink-0 h-full" aria-hidden style={{ width: endPad }} />
      </div>
    </section>
  )
}

/* ───────────────────────────── Icons ───────────────────────────── */
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="3" className="fill-white/90" />
      <path d="M7 17V10" stroke="#0a66c2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="7" r="1.2" fill="#0a66c2" />
      <path d="M12 17V12.5c0-1.9 2.5-2.1 3.1-.6V17" stroke="#0a66c2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" className="stroke-white/90" strokeWidth="2" />
      <path d="M5 7l7 6 7-6" className="stroke-white/90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ───────────────────────────── Helpers ───────────────────────────── */
const CARD_RATIO = 7 / 5 // height = width * 1.4

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

function elCenterToAnchor(el, anchorX) {
  const r = el.getBoundingClientRect()
  const center = r.left + r.width / 2
  return center - anchorX
}

function getNearestByAnchor(els, anchorX) {
  let best = 0, bestDist = Infinity
  els.forEach((el, i) => {
    if (!el) return
    const d = Math.abs(elCenterToAnchor(el, anchorX))
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

// Compute a responsive card width bounded by viewport and desired preference.
// On small screens (<640px): allow a single-column max width.
// On larger screens: cap to roughly half the viewport minus gutters, so two columns
// can be visible with overlap.
function computeCardWidth(vw, preferred) {
  const gutter = 32, lineThickness = 2
  const maxTwoCol = Math.max(220, (vw / 2) - gutter - lineThickness)
  const maxOneCol = Math.max(220, vw - (gutter * 2))
  const w = vw < 640 ? Math.min(preferred, maxOneCol) : Math.min(preferred, maxTwoCol)
  return Math.round(w)
}
