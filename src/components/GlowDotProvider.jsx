import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

const GlowDotCtx = createContext(null)

/**
 * Props:
 *  - threshold?: number (default 0.3)
 *  - openStrategy?: "next" | "all" (default "next")
 *  - cooldownMs?: number (default 400)
 *  - NextPage?: React.ComponentType | React.ReactNode
 *  - PrevPage?: React.ComponentType | React.ReactNode
 *  - transitionDown?: "slide-in" | "slide-out" | "zoom-in" | "zoom-out" (default "slide-in")
 *  - transitionUp?:   same (default "slide-out")
 *  - transitionDurationMs?: number (default 500)
 *  - suppressAfterNavigate?: boolean (default true)
 *  - baseRef?: React.RefObject<HTMLElement>
 *  - effectDurations?: { slideIn?: number; slideOut?: number; zoomIn?: number; zoomOut?: number }
 *  - zoomScaleIn?: number   // default 1.18
 *  - zoomScaleOut?: number  // default 0.82
 *  - easing?: string        // default "cubic-bezier(0.2, 0.8, 0.2, 1)"
 */
export function GlowDotProvider({
  children,
  threshold = 0.3,
  openStrategy = "next",
  cooldownMs = 400,
  NextPage = null,
  PrevPage = null,
  transitionDown = "slide-in",
  transitionUp = "slide-out",
  transitionDurationMs = 500,
  suppressAfterNavigate = true,
  baseRef = null,
  effectDurations,
  zoomScaleIn = 1.18,
  zoomScaleOut = 0.82,
  easing = "cubic-bezier(0.2, 0.8, 0.2, 1)",
}) {
  // ---------- Dot registry ----------
  const dotsRef = useRef(new Map())
  const [, force] = useState(0)
  const rerender = () => force(x => x + 1)

  const register = useCallback((id, api) => {
    dotsRef.current.set(id, { ...api, visible: false })
    rerender()
    return () => { dotsRef.current.delete(id); rerender() }
  }, [])

  const setVisible = useCallback((id, visible) => {
    const e = dotsRef.current.get(id)
    if (e) e.visible = visible
  }, [])

  const [suppressed, setSuppressed] = useState(false)

  function getVisibleSorted() {
    if (suppressed) return []
    const arr = []
    dotsRef.current.forEach((v, id) => {
      if (!v.visible) return
      const r = v.getRect()
      if (!r) return
      arr.push({ id, top: r.top, left: r.left })
    })
    arr.sort((a, b) => a.top - b.top || a.left - b.left)
    return arr
  }

  function getCounts() {
    const vis = getVisibleSorted().map(x => x.id)
    let open = 0
    vis.forEach(id => { if (dotsRef.current.get(id)?.isOpen()) open += 1 })
    return { visibleCount: vis.length, openCount: open, unopened: vis.filter(id => !dotsRef.current.get(id)?.isOpen()) }
  }

  function openNextVisible() {
    const { unopened } = getCounts()
    const id = unopened[0]
    if (!id) return 0
    dotsRef.current.get(id)?.open()
    return 1
  }

  function openAllVisible() {
    const { unopened } = getCounts()
    unopened.forEach(id => dotsRef.current.get(id)?.open())
    return unopened.length
  }

  const tryOpenByStrategy = useCallback(() => {
    if (openStrategy === "all") return openAllVisible() > 0
    return openNextVisible() > 0
  }, [openStrategy])

  const allVisibleAreOpen = () => {
    const { visibleCount, openCount } = getCounts()
    return visibleCount > 0 && visibleCount === openCount
  }

  // ---------- Per-effect durations ----------
  function dur(effect /* "slide-in" | "slide-out" | "zoom-in" | "zoom-out" */) {
    const e = effectDurations || {}
    if (effect === "slide-in"  && typeof e.slideIn  === "number") return e.slideIn
    if (effect === "slide-out" && typeof e.slideOut === "number") return e.slideOut
    if (effect === "zoom-in"   && typeof e.zoomIn   === "number") return e.zoomIn
    if (effect === "zoom-out"  && typeof e.zoomOut  === "number") return e.zoomOut

    if (effect === "slide-in")  return transitionDurationMs
    if (effect === "slide-out") return Math.round(transitionDurationMs * 1.2)
    if (effect === "zoom-in")   return Math.round(transitionDurationMs * 1.8)
    if (effect === "zoom-out")  return Math.round(transitionDurationMs * 1.8)
    return transitionDurationMs
  }

  // ---------- Animation plumbing (overlay + base target) ----------
  const internalBaseRef = useRef(null)               // fallback when baseRef not provided
  const targetBaseRef = baseRef ?? internalBaseRef

  const animTokenRef = useRef(0)
  const cleanupTimerRef = useRef(0)
  const BASE_Z_SENTINEL = "data-gd-base-z"

  function ensureBaseBaseline(el) {
    if (!el) return
    // Clear transform/opacity/transition so slide-in leaves page pixel-stable
    el.style.transform = "none"
    el.style.opacity = "1"
    el.style.pointerEvents = ""
    el.style.transitionProperty = ""
    el.style.transitionTimingFunction = ""
    el.style.transitionDuration = ""
    el.style.willChange = ""
    el.style.backfaceVisibility = ""
    if (el.getAttribute(BASE_Z_SENTINEL) === "1") {
      el.style.zIndex = ""
      el.removeAttribute(BASE_Z_SENTINEL)
    }
  }

  // Overlay state (portal)
  const [overlay, setOverlay] = useState({
    node: null,
    visible: false,           // drives transition
    transition: "slide-in",   // "slide-in" | "reveal" | "fade-in" | "behind"
    key: 0,                   // force remount per nav
    zIndex: 101,              // 101 = above (changed per effect)
    effect: "slide-in",
  })

  function asNode(x) {
    if (!x) return null
    if (typeof x === "function") {
      const Comp = x
      return <Comp />
    }
    return x
  }

  // Map effect → (overlay motion, base motion, overlay z-plane)
  function computeModes(effect /* external name */) {
    if (effect === "slide-in")  return { effect, overlayName: "slide-in", baseMode: "neutral",   zIndex: 101 }  // overlay above, base unchanged
    if (effect === "slide-out") return { effect, overlayName: "behind",   baseMode: "slide-out", zIndex: 0   }  // overlay behind, base slides away
    if (effect === "zoom-in")   return { effect, overlayName: "fade-in",  baseMode: "zoom-in",   zIndex: 101 }
    if (effect === "zoom-out")  return { effect, overlayName: "fade-in",  baseMode: "zoom-out",  zIndex: 101 }
    return { effect: "slide-in", overlayName: "slide-in", baseMode: "neutral", zIndex: 101 }
  }

  // Only touch transform/opacity; no layout changes.
  function animateBase(baseMode, token, effectName) {
    const el = targetBaseRef.current
    if (!el) return

    // For slide-in, keep base untouched and scrub leftovers to avoid UI nudges
    if (baseMode === "neutral") { ensureBaseBaseline(el); return }

    const D = dur(effectName)

    // Ensure base sits *above* overlay while it moves away
    const prevZ = el.style.zIndex
    if (!prevZ) {
      el.style.zIndex = "10"
      el.setAttribute(BASE_Z_SENTINEL, "1")
    }

    // Reset to neutral before anim
    el.style.transitionProperty = "transform, opacity"
    el.style.transitionTimingFunction = easing
    el.style.transitionDuration = `${D}ms`
    el.style.willChange = "transform, opacity"
    el.style.backfaceVisibility = "hidden"
    el.style.pointerEvents = ""          // interactive at start
    el.style.transform = "none"
    el.style.opacity = "1"

    // double rAF to ensure initial styles commit
    requestAnimationFrame(() => {
      if (animTokenRef.current !== token) return
      requestAnimationFrame(() => {
        if (animTokenRef.current !== token) return
        if (baseMode === "slide-out") {
          el.style.transform = "translateX(100%)"
          el.style.opacity = "1"
        } else if (baseMode === "zoom-in") {
          el.style.transform = `scale(${zoomScaleIn})`
          el.style.opacity = "0"
        } else if (baseMode === "zoom-out") {
          el.style.transform = `scale(${zoomScaleOut})`
          el.style.opacity = "0"
        } else {
          el.style.transform = "none"
          el.style.opacity = "1"
        }
      })
    })

    // After motion, keep base inert and off-screen; don't change layout or reset transform.
    if (baseMode === "slide-out" || baseMode === "zoom-in" || baseMode === "zoom-out") {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = window.setTimeout(() => {
        if (animTokenRef.current !== token) return
        el.style.pointerEvents = "none"
        cleanupTimerRef.current = 0
      }, D + 20)
    }
  }

  function mountOverlay(whichTransition /* external name */, CompOrNode) {
    const node = asNode(CompOrNode)
    if (!node) return false

    const { effect, overlayName, baseMode, zIndex } = computeModes(whichTransition)

    const token = ++animTokenRef.current
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = 0
    }

    // If base stays neutral for slide-in, scrub stale inline styles first
    if (baseMode === "neutral") ensureBaseBaseline(targetBaseRef.current)

    // 1) Mount overlay (for "behind", make it visible immediately under the base)
    const startVisible = overlayName === "behind"
    setOverlay(prev => ({
      node,
      visible: startVisible,
      transition: overlayName,
      key: prev.key + 1,
      zIndex,
      effect
    }))

    // 2) If overlay is behind, animate base right away; else, show overlay then move base.
    if (overlayName === "behind") {
      animateBase(baseMode, token, effect)
    } else {
      requestAnimationFrame(() => {
        if (animTokenRef.current !== token) return
        requestAnimationFrame(() => {
          if (animTokenRef.current !== token) return
          setOverlay(prev => ({ ...prev, visible: true }))
          if (baseMode !== "neutral") animateBase(baseMode, token, effect)
        })
      })
    }

    if (suppressAfterNavigate) setSuppressed(true)
    return true
  }

  function replaceOverlay(whichTransition, CompOrNode) {
    return mountOverlay(whichTransition, CompOrNode)
  }

  function overlayStyle(visible, overlayName, zIndex, effectName) {
    // For the "behind" mode we want no motion; ensure no animation duration is applied.
    const isBehind = overlayName === "behind"
    const D = isBehind ? 0 : dur(effectName)

    const style = {
      position: "fixed",
      inset: 0,
      pointerEvents: "auto",
      willChange: "transform, opacity",
      transitionProperty: "transform, opacity",
      transitionTimingFunction: easing,
      transitionDuration: `${D}ms`,
      zIndex,
      // compositing isolation
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      contain: "paint",
    }

    if (overlayName === "slide-in") {
      style.transform = visible ? "translateX(0)" : "translateX(-100%)"
      style.opacity = 1
    } else if (overlayName === "reveal") {
      style.transform = "translateX(0)"
      style.opacity = visible ? 1 : 0
    } else if (overlayName === "behind") {
      style.transform = "none"
      style.opacity = 1
    } else { // "fade-in" (zoom-in/out)
      style.transform = "translateZ(0)"
      style.opacity = visible ? 1 : 0
    }

    return style
  }

  const overlayPortal = overlay.node
    ? createPortal(
        <div
          className="gd-overlay"
          style={overlayStyle(overlay.visible, overlay.transition, overlay.zIndex, overlay.effect)}
          key={overlay.key}
        >
          <div className="h-full w-full bg-transparent">
            {overlay.node}
          </div>
        </div>,
        document.body
      )
    : null

  // ---------- Input interception ----------
  const cooldownUntil = useRef(0)
  const isCooling = () => performance.now() < cooldownUntil.current
  const armCooldown = () => { cooldownUntil.current = performance.now() + cooldownMs }

  useEffect(() => {
    function handleDown(e) {
      if (isCooling()) return false

      const { visibleCount } = getCounts()
      if (visibleCount === 0) return false

      const opened = tryOpenByStrategy()
      if (opened) { e.preventDefault(); e.stopPropagation(); armCooldown(); return true }

      if (allVisibleAreOpen() && NextPage) {
        const did = overlay.node ? replaceOverlay(transitionDown, NextPage) : mountOverlay(transitionDown, NextPage)
        if (did) { e.preventDefault(); e.stopPropagation(); armCooldown(); return true }
      }
      return false
    }

    function handleUp(e) {
      if (isCooling()) return false
      if (!PrevPage) return false

      const { visibleCount } = getCounts()
      if (visibleCount === 0) return false

      const did = overlay.node ? replaceOverlay(transitionUp, PrevPage) : mountOverlay(transitionUp, PrevPage)
      if (did) { e.preventDefault(); e.stopPropagation(); armCooldown(); return true }
      return false
    }

    function onKeyDown(e) {
      if (e.key === "ArrowDown" || e.key === "PageDown") { if (handleDown(e)) return }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { if (handleUp(e)) return }
    }

    function onWheel(e) {
      if (e.deltaY > 0) { if (handleDown(e)) return }
      else if (e.deltaY < 0) { if (handleUp(e)) return }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener("wheel", onWheel, { passive: false, capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener("wheel", onWheel, { capture: true })
    }
  }, [tryOpenByStrategy, NextPage, PrevPage, overlay.node, transitionDown, transitionUp, transitionDurationMs, suppressed, effectDurations, zoomScaleIn, zoomScaleOut, easing])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current)
    }
  }, [])

  // ---------- Context ----------
  const value = useMemo(() => ({ register, setVisible, threshold }), [register, setVisible, threshold])

  return (
    <GlowDotCtx.Provider value={value}>
      {/* Fallback wrapper only used if you DON'T pass baseRef */}
      <div ref={baseRef ? undefined : internalBaseRef}>
        {children}
      </div>
      {overlayPortal}
    </GlowDotCtx.Provider>
  )
}

export function useGlowDotController() {
  const ctx = useContext(GlowDotCtx)
  if (!ctx) throw new Error("useGlowDotController must be used inside <GlowDotProvider>")
  return ctx
}