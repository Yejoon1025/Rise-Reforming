// src/components/timeline-overlay.jsx
import { useEffect, useRef, useState } from "react"

export function TimeLine({
  items = [],
  backgroundUrl,
  color = "#3ca6a6",
  progressColor,
  dotSize = 12,
  cardWidth = 420,
  className = "",
  pushFactor = 0.47, // 0.50 = exact align; <0.5 = slightly less push
}) {
  const sectionRef = useRef(null)
  const panelsRef = useRef([])
  const firstCardRef = useRef(null)

  const [active, setActive] = useState(0)
  const [computedCardW, setComputedCardW] = useState(cardWidth)
  const [firstCardH, setFirstCardH] = useState(0)

  // progress line (page scroll)
  const [lineTop, setLineTop] = useState(0)
  const [progressH, setProgressH] = useState(0)

  // nav + UI state
  const isAutoScrollingRef = useRef(false)
  const scrollIdleTimerRef = useRef(null)
  const [showToTop, setShowToTop] = useState(false)
  const [isAtPageTop, setIsAtPageTop] = useState(true)
  const [isReturningToTop, setIsReturningToTop] = useState(false) // primes push during scroll-to-top

  // tuning
  const HYSTERESIS_RATIO = 0.22
  const SOFT_ZONE_RATIO = 0.28
  const progColor = progressColor || color
  const ALIGN_EPS = 6
  const TOP_EPS = 2

  // measure first card height (keeps push exact as it resizes)
  useEffect(() => {
    if (!firstCardRef.current) return
    const el = firstCardRef.current
    const ro = new ResizeObserver(es => {
      const r = es[0].contentRect
      setFirstCardH(r.height || 0)
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setFirstCardH(r.height || 0)
    return () => ro.disconnect()
  }, [computedCardW, items.length])

  // window scroll / resize effects (single page scroll)
  useEffect(() => {
    function onScrollOrResize() {
      const root = sectionRef.current
      const vh = window.innerHeight
      if (!root || !vh) return

      // how far into timeline section we are
      const rect = root.getBoundingClientRect()
      const total = Math.max(0, root.scrollHeight - vh)
      const within = clamp(-rect.top, 0, total)

      const half = vh / 2
      const t = Math.max(0, half - within) // line starts at the dot
      setLineTop(t)
      setProgressH(Math.max(0, Math.min(half, half - t)))

      setComputedCardW(computeCardWidth(window.innerWidth, cardWidth))
      setShowToTop(window.scrollY > 100)

      const nowAtTop = window.scrollY <= TOP_EPS
      setIsAtPageTop(nowAtTop)
      if (nowAtTop && isReturningToTop) setIsReturningToTop(false)

      // debounce: choose nearest panel + unlock nav
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false
        const nearest = getNearestIndexWindow(panelsRef.current, vh)
        maybeSetActive(nearest, vh)
      }, 140)
    }

    onScrollOrResize()
    window.addEventListener("scroll", onScrollOrResize, { passive: true })
    window.addEventListener("resize", onScrollOrResize)
    window.addEventListener("orientationchange", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize)
      window.removeEventListener("resize", onScrollOrResize)
      window.removeEventListener("orientationchange", onScrollOrResize)
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    }
  }, [cardWidth, isReturningToTop])

  // keyboard navigation
  useEffect(() => {
    const onKey = e => {
      const k = e.key
      if (k !== "ArrowDown" && k !== "PageDown" && k !== "ArrowUp" && k !== "PageUp") return

      const timelineRect = sectionRef.current?.getBoundingClientRect()
      const inViewport = timelineRect && timelineRect.top < window.innerHeight && timelineRect.bottom > 0
      if (!inViewport) return

      e.preventDefault()
      if (isAutoScrollingRef.current) return

      const beforeTop = timelineRect.top > ALIGN_EPS
      const atTop = Math.abs(timelineRect.top) <= ALIGN_EPS

      if (k === "ArrowUp" || k === "PageUp") {
        if (atTop) return backToTop(true) // prime the push so it animates simultaneously
        return go(-1)
      }

      // First Down: align timeline to top (engage sticky) before advancing
      if (beforeTop) {
        isAutoScrollingRef.current = true
        window.scrollTo({ top: window.scrollY + timelineRect.top, behavior: "smooth" })
        if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
        scrollIdleTimerRef.current = setTimeout(() => { isAutoScrollingRef.current = false }, 420)
        return
      }

      return go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items.length])

  function go(delta) {
    const vh = window.innerHeight
    const current = getNearestIndexWindow(panelsRef.current, vh)
    const next = clamp(current + delta, 0, items.length - 1)
    if (next === current) return
    const el = panelsRef.current[next]
    if (!el) return
    isAutoScrollingRef.current = true
    const top = window.scrollY + el.getBoundingClientRect().top
    window.scrollTo({ top, behavior: "smooth" })
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false
      setActive(next)
    }, 420)
  }

  // back-to-top; primePush=true starts the card push before scrolling begins
  function backToTop(primePush = false) {
    if (primePush) setIsReturningToTop(true)
    isAutoScrollingRef.current = true
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false
      if (primePush && window.scrollY > TOP_EPS) setIsReturningToTop(false)
    }, 500)
  }

  function maybeSetActive(proposedIdx, vh) {
    const centerY = vh / 2
    const currentEl = panelsRef.current[active]
    const proposedEl = panelsRef.current[proposedIdx]
    if (!proposedEl) return setActive(proposedIdx)
    const dProposed = Math.abs(elCenterViewportY(proposedEl) - centerY)
    const dCurrent = currentEl ? Math.abs(elCenterViewportY(currentEl) - centerY) : Infinity
    const hysteresisPx = (vh / 2) * HYSTERESIS_RATIO
    if (dProposed + hysteresisPx < dCurrent) setActive(proposedIdx)
  }

  function isInSoftZone(i) {
    const vh = window.innerHeight
    const el = panelsRef.current[i]
    if (!vh || !el) return i === active
    const centerY = vh / 2
    return Math.abs(elCenterViewportY(el) - centerY) <= (vh / 2) * SOFT_ZONE_RATIO
  }

  return (
    <section
      ref={sectionRef}
      className={`relative w-full ${className}`}
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
      aria-label="Timeline"
    >
      {/* Sticky overlay: center line + dot */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full">
          {/* base line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-[#374151]"
            style={{ top: lineTop, height: `calc(100vh - ${lineTop}px)`, width: "1.25px" }}
            aria-hidden
          />
          {/* cyan progress above the dot */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: lineTop,
              height: progressH,
              width: "1.25px",
              background: progColor,
              boxShadow: `0 0 10px ${hexToRgba(progColor, 0.55)}`,
            }}
            aria-hidden
          />
          {/* center dot */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: dotSize, height: dotSize }}
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

      {/* Panels (page scrolling) */}
      <div role="list">
        {items.map((it, i) => {
          const inZone = isInSoftZone(i)
          const CardTag = it.href ? "a" : "div"
          const cardProps = it.href
            ? {
                href: it.href,
                target: it.target || "_blank",
                rel: "noopener noreferrer",
                "aria-label": it.ariaLabel || `Open ${it.title || it.date}`,
              }
            : {}

          const isFirst = i === 0
          const pf = clamp(pushFactor, 0, 1)
          const pushActive = isFirst && (isAtPageTop || isReturningToTop)
          const translateY = pushActive ? firstCardH * pf : 0

          return (
            <article
              key={it.id || i}
              ref={el => (panelsRef.current[i] = el)}
              role="listitem"
              className="min-h-screen w-full"
            >
              <div className="grid min-h-screen w-full grid-cols-2 items-center">
                {/* DATE (left) with soft highlight */}
                <div className="flex justify-end pr-8">
                  <time
                    className={`select-none font-sans text-xl md:text-2xl transition-opacity ${
                      inZone ? "text-white/80" : "text-white/50"
                    }`}
                  >
                    {it.date}
                  </time>
                </div>

                {/* CARD (right) — GlowDot-style with optional link/image */}
                <div className="pl-8">
                  <CardTag
                    {...cardProps}
                    ref={isFirst ? firstCardRef : null}
                    className={`block rounded-2xl bg-[#0c1a22]/85 text-[#e0e0e0] shadow-xl backdrop-blur-sm px-4 py-3 select-none
                                transition-[opacity,transform] duration-300 will-change-transform ${
                                  inZone ? "opacity-100" : "opacity-70"
                                } ${it.href ? "cursor-pointer hover:opacity-100 focus:opacity-100" : ""}`}
                    style={{ width: computedCardW, transform: `translateY(${translateY}px)` }}
                  >
                    {it.title ? (
                      <h3 className="mb-2 font-bahnschrift text-2xl md:text-3xl text-[#f8da9c]">
                        {it.title}
                      </h3>
                    ) : null}

                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-snug">
                      {it.body}
                    </p>

                    {it.image?.src ? (
                      <img
                        src={it.image.src}
                        alt={it.image.alt || ""}
                        loading="lazy"
                        className="mt-3 w-full h-auto rounded-2xl object-cover"
                      />
                    ) : null}
                  </CardTag>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Floating "back to top" arrow (centered inside circle) */}
      <button
        type="button"
        onClick={() => backToTop(true)}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 h-9 w-9 rounded-full border border-white/20 bg-[#0c1a22]/70 backdrop-blur-sm text-white/80
                    shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-opacity duration-200
                    ${showToTop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} flex items-center justify-center`}
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 12px ${hexToRgba(progColor, 0.35)}` }}
      >
        <svg className="block" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </section>
  )
}

/* helpers */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
function elCenterViewportY(el) { const r = el.getBoundingClientRect(); return r.top + r.height / 2 }
function getNearestIndexWindow(els, vh) {
  const center = vh / 2
  let best = 0, bestDist = Infinity
  els.forEach((el, i) => {
    if (!el) return
    const d = Math.abs(elCenterViewportY(el) - center)
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
  return vw < 640 ? Math.min(preferred, maxOneCol) : Math.min(preferred, maxTwoCol)
}
