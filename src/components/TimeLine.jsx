// src/components/TimeLine.jsx
import { useEffect, useRef, useState } from "react"
import { ChevronUp } from "lucide-react"

// Match this to the fade in news.jsx if different
const NEWS_FADE = "transition-opacity duration-700 ease-out"

export function TimeLine({
  items = [],
  backgroundUrl,
  overlayUrl, // ⟵ NEW: cover image over base background
  overlayOpacity,
  color = "#3ca6a6",
  progressColor,
  dotSize = 12,
  cardWidth = 420,
  className = "",
  pushFactor = 0.47,
}) {
  const sectionRef = useRef(null)
  const panelsRef = useRef([])
  const firstCardRef = useRef(null)

  const [active, setActive] = useState(0)
  const [computedCardW, setComputedCardW] = useState(cardWidth)
  const [firstCardH, setFirstCardH] = useState(0)

  const [lineTop, setLineTop] = useState(0)
  const [progressH, setProgressH] = useState(0)

  const isAutoScrollingRef = useRef(false)
  const scrollIdleTimerRef = useRef(null)
  const [showToTop, setShowToTop] = useState(false)
  const [isAtPageTop, setIsAtPageTop] = useState(true) // drives fade in/out
  const [isReturningToTop, setIsReturningToTop] = useState(false)

  const wheelAccumRef = useRef(0)
  const touchStartYRef = useRef(0)
  const touchAccumRef = useRef(0)

  const activeRef = useRef(0)
  const pendingActiveRef = useRef(null)
  const centerIORef = useRef(null)

  const [firstDownFlash, setFirstDownFlash] = useState(false)
  const firstDownTimerRef = useRef(null)

  const HYSTERESIS_RATIO = 0.22
  const SOFT_ZONE_RATIO = 0.28
  const progColor = progressColor || color
  const ALIGN_EPS = 6
  const TOP_EPS = 2
  const WHEEL_TRIGGER_PX = 48
  const TOUCH_TRIGGER_PX = 36

  useEffect(() => () => {
    if (firstDownTimerRef.current) clearTimeout(firstDownTimerRef.current)
  }, [])

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

  useEffect(() => {
    function onScrollOrResize() {
      const root = sectionRef.current
      const vh = window.innerHeight
      if (!root || !vh) return

      const rect = root.getBoundingClientRect()
      const total = Math.max(0, root.scrollHeight - vh)
      const within = clamp(-rect.top, 0, total)

      const half = vh / 2
      const t = Math.max(0, half - within)
      setLineTop(t)
      setProgressH(Math.max(0, Math.min(half, half - t)))

      setComputedCardW(computeCardWidth(window.innerWidth, cardWidth))
      setShowToTop(window.scrollY > 100)

      const nowAtTop = window.scrollY <= TOP_EPS
      setIsAtPageTop(nowAtTop)
      if (nowAtTop && isReturningToTop) setIsReturningToTop(false)

      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
      scrollIdleTimerRef.current = setTimeout(() => {
        isAutoScrollingRef.current = false

        const pending = pendingActiveRef.current
        if (Number.isInteger(pending)) {
          pendingActiveRef.current = null
          setActiveStable(pending)
          return
        }

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
        if (atTop) return backToTop(true)
        return go(-1)
      }

      if (beforeTop) return alignTimelineTop(timelineRect.top)
      return go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items.length])

  useEffect(() => {
    const onWheel = e => {
      const timelineRect = sectionRef.current?.getBoundingClientRect()
      if (!timelineRect) return
      const inViewport = timelineRect.top < window.innerHeight && timelineRect.bottom > 0
      if (!inViewport) return
      if (isAutoScrollingRef.current) { e.preventDefault(); return }

      wheelAccumRef.current += e.deltaY
      if (Math.abs(wheelAccumRef.current) < WHEEL_TRIGGER_PX) {
        e.preventDefault()
        return
      }

      const down = wheelAccumRef.current > 0
      wheelAccumRef.current = 0
      e.preventDefault()

      const beforeTop = timelineRect.top > ALIGN_EPS
      const atTop = Math.abs(timelineRect.top) <= ALIGN_EPS

      if (!down) {
        if (atTop) return backToTop(true)
        return go(-1)
      }

      if (beforeTop) return alignTimelineTop(timelineRect.top)
      return go(1)
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    return () => window.removeEventListener("wheel", onWheel)
  }, [items.length])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const onTouchStart = e => {
      if (!isInViewport(sectionRef.current)) return
      touchStartYRef.current = e.touches[0]?.clientY || 0
      touchAccumRef.current = 0
    }

    const onTouchMove = e => {
      if (!isInViewport(sectionRef.current)) return
      if (isAutoScrollingRef.current) { e.preventDefault(); return }
      const y = e.touches[0]?.clientY || 0
      touchAccumRef.current = (touchStartYRef.current - y)
      e.preventDefault()
    }

    const onTouchEnd = () => {
      if (!isInViewport(sectionRef.current)) return
      if (isAutoScrollingRef.current) return

      const delta = touchAccumRef.current
      touchAccumRef.current = 0
      if (Math.abs(delta) < TOUCH_TRIGGER_PX) return

      const timelineRect = sectionRef.current.getBoundingClientRect()
      const beforeTop = timelineRect.top > ALIGN_EPS
      const atTop = Math.abs(timelineRect.top) <= ALIGN_EPS
      const down = delta > 0

      if (!down) {
        if (atTop) return backToTop(true)
        return go(-1)
      }

      if (beforeTop) return alignTimelineTop(timelineRect.top)
      return go(1)
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    el.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [items.length])

  useEffect(() => {
    if (!panelsRef.current.length) return

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const idx = Number(e.target.getAttribute("data-idx"))
          if (Number.isNaN(idx)) continue

          if (isAutoScrollingRef.current) pendingActiveRef.current = idx
          else setActiveStable(idx)
        }
      },
      { root: null, rootMargin: "-48% 0px -48% 0px", threshold: [0.01] }
    )

    panelsRef.current.forEach((el, i) => {
      if (!el) return
      el.setAttribute("data-idx", String(i))
      io.observe(el)
    })

    centerIORef.current = io
    return () => io.disconnect()
  }, [items.length])

  function alignTimelineTop(offsetTop) {
    setFirstDownFlash(true)
    if (firstDownTimerRef.current) clearTimeout(firstDownTimerRef.current)
    firstDownTimerRef.current = setTimeout(() => setFirstDownFlash(false), 900)

    isAutoScrollingRef.current = true
    window.scrollTo({ top: window.scrollY + offsetTop, behavior: "smooth" })
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => { isAutoScrollingRef.current = false }, 420)
  }

  function go(delta) {
    const vh = window.innerHeight
    const current = getNearestIndexWindow(panelsRef.current, vh)
    const next = clamp(current + delta, 0, items.length - 1)
    if (next === current) return
    const el = panelsRef.current[next]
    if (!el) return
    isAutoScrollingRef.current = true
    const top = window.scrollY + el.getBoundingClientRect().top
    pendingActiveRef.current = next
    window.scrollTo({ top, behavior: "smooth" })
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false
      const idx = Number.isInteger(pendingActiveRef.current) ? pendingActiveRef.current : next
      pendingActiveRef.current = null
      setActiveStable(idx)
    }, 420)
  }

  function backToTop(primePush = false) {
    if (primePush) setIsReturningToTop(true)
    isAutoScrollingRef.current = true
    pendingActiveRef.current = 0
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current)
    scrollIdleTimerRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false
      const idx = Number.isInteger(pendingActiveRef.current) ? pendingActiveRef.current : 0
      pendingActiveRef.current = null
      setActiveStable(idx)
      if (primePush && window.scrollY > TOP_EPS) setIsReturningToTop(false)
    }, 500)
  }

  function setActiveStable(idx) {
    if (idx === activeRef.current) {
      focusCard(idx)
      return
    }
    activeRef.current = idx
    setActive(idx)
    requestAnimationFrame(() => focusCard(idx))
  }

  function focusCard(idx) {
    const container = panelsRef.current[idx]
    if (!container) return
    let el =
      container.querySelector('[data-card]') ||
      container.querySelector('a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])')
    if (!el) el = container
    const shouldSetTabIndex = el.getAttribute && el.getAttribute("tabindex") === null && el.tagName === "DIV"
    if (shouldSetTabIndex) el.setAttribute("tabindex", "0")
    try { el.focus({ preventScroll: true }) } catch { el.focus() }
  }

  function maybeSetActive(proposedIdx, vh) {
    const centerY = vh / 2
    const currentEl = panelsRef.current[activeRef.current]
    const proposedEl = panelsRef.current[proposedIdx]
    if (!proposedEl) return setActiveStable(proposedIdx)
    const dProposed = Math.abs(elCenterViewportY(proposedEl) - centerY)
    const dCurrent = currentEl ? Math.abs(elCenterViewportY(currentEl) - centerY) : Infinity
    const hysteresisPx = (vh / 2) * HYSTERESIS_RATIO
    if (dProposed + hysteresisPx < dCurrent) setActiveStable(proposedIdx)
  }

  function isInSoftZone(i) {
    const vh = window.innerHeight
    const el = panelsRef.current[i]
    if (!vh || !el) return i === activeRef.current
    const centerY = vh / 2
    return Math.abs(elCenterViewportY(el) - centerY) <= (vh / 2) * SOFT_ZONE_RATIO
  }

  return (
    <section
      ref={sectionRef}
      className={`relative z-10 w-full ${className}`} // ⟵ ensure content stays above the overlay image
      style={{
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
      aria-label="Timeline"
    >
      {/* NEW: full-viewport cover image that fades out when leaving the top */}
      {overlayUrl ? (
        <img
          src={overlayUrl}
          alt=""
          aria-hidden
          className={[
            // fixed so it covers the base background, unaffected by scroll
            "fixed inset-0 h-screen w-screen object-cover pointer-events-none z-0",
          ]}
          style={{ opacity : overlayOpacity}}
        />
      ) : null}

      {/* Sticky overlay (line + dot) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-screen w-full">
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-[#374151]"
            style={{ top: lineTop, height: `calc(100vh - ${lineTop}px)`, width: "1.25px" }}
            aria-hidden
          />
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

      {/* Panels */}
      <div role="list">
        {items.map((it, i) => {
          const inZone = isInSoftZone(i) || (i === 0 && firstDownFlash)
          const isActive = i === active
          const CardTag = it.href ? "a" : "div"
          const cardProps = it.href
            ? { href: it.href, target: it.target || "_blank", rel: "noopener noreferrer", "aria-label": it.ariaLabel || `Open ${it.title || it.date}` }
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
              data-idx={i}
            >
              <div className="grid min-h-screen w-full grid-cols-2 items-center">
                <div className="flex justify-end pr-8">
                  <time className={`select-none font-sans text-xl md:text-2xl transition-opacity z-20 ${inZone ? "text-white/80" : "text-white/50"}`}>
                    {it.date}
                  </time>
                </div>

                <div className="pl-8">
                  <CardTag
                    {...cardProps}
                    ref={isFirst ? firstCardRef : null}
                    data-card
                    aria-current={isActive ? "step" : undefined}
                    tabIndex={isActive ? 0 : -1}
                    className={`block rounded-2xl bg-[#0c1a22]/85 text-[#e0e0e0] shadow-xl backdrop-blur-sm px-4 py-3 select-none
                                transition-[opacity,transform] duration-300 will-change-transform
                                outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0
                                ${inZone ? "opacity-100" : "opacity-70"}
                                ${it.href ? "cursor-pointer hover:opacity-100 focus:opacity-100" : ""}`}
                    style={{
                      width: computedCardW,
                      transform: `translateY(${translateY}px)`,
                      WebkitTapHighlightColor: "transparent"
                    }}
                  >
                    {it.title ? (
                      <h3 className="mb-2 font-bahnschrift text-2xl md:text-3xl text-[#f8da9c]">
                        {it.title}
                      </h3>
                    ) : null}

                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl leading-snug">
                      {it.body}
                    </p>

                    {it.href ? (
                      <p className="mt-2 text-sm text-white/60">Click to learn more</p>
                    ) : null}

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

      {/* Back to top — Chevron only, no circle */}
      <button
        type="button"
        onClick={() => backToTop(true)}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 text-white/80 transition-opacity duration-200
                    ${showToTop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} 
                    hover:text-white focus:outline-none focus:ring-0`}
        style={{ background: "transparent", border: "none" }}
      >
        <ChevronUp className="h-6 w-6 animate-bounce" aria-hidden />
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
function isInViewport(el) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.top < window.innerHeight && r.bottom > 0
}

