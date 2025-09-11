import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

const GlowDotCtx = createContext(null)

/**
 * GlowDotProvider — DOWN scroll/arrow interception only (conditional)
 *
 * Behavior:
 *  - If at least one registered GlowDot is VISIBLE and NOT all visible dots are open,
 *    the provider *steals priority* for **ArrowDown** and **wheel-down** only.
 *    It prevents default + stops propagation and opens dots according to `openOnDown`.
 *  - Otherwise, it does nothing and lets the page scroll/keys behave normally.
 *
 * Props kept (slim):
 *  - threshold: visibility threshold for dots to report as visible (consumed by GlowDot)
 *  - openOnDown: "next" | "all" (default: "next"). Controls how dots open on down actions.
 *  - transitionDurationMs, effectDurations, baseRef, zoomScaleIn, zoomScaleOut, easing
 *
 * Context API:
 *  - { register, setVisible, threshold, presentOverlay, replaceOverlay, dismissOverlay }
 */
export function GlowDotProvider({
  children,
  threshold = 0.3,
  openOnDown = "next",
  transitionDurationMs = 500,
  effectDurations,
  baseRef = null,
  zoomScaleIn = 1.18,
  zoomScaleOut = 0.82,
  easing = "cubic-bezier(0.2, 0.8, 0.2, 1)",
}) {
  // ---------- Dot registry ----------
  const dotsRef = useRef(new Map())
  const [, force] = useState(0)
  const rerender = () => force(x => x + 1)

  const register = useCallback((id, api) => {
    if (!id || !api) return () => {}
    dotsRef.current.set(id, { ...api, visible: false })
    rerender()
    return () => { dotsRef.current.delete(id); rerender() }
  }, [])

  const setVisible = useCallback((id, visible) => {
    const e = dotsRef.current.get(id)
    if (e) e.visible = !!visible
  }, [])

  // ---------- Helpers (internal) ----------
  function getVisibleEntriesSorted() {
    const entries = [...dotsRef.current.entries()].filter(([, v]) => v.visible)
    entries.sort((a, b) => {
      const ra = a[1].getRect?.()
      const rb = b[1].getRect?.()
      if (!ra && !rb) return 0
      if (!ra) return 1
      if (!rb) return -1
      return (ra.top ?? 0) - (rb.top ?? 0)
    })
    return entries
  }

  function hasVisibleDots() { return getVisibleEntriesSorted().length > 0 }
  function areAllVisibleOpen() {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false
    return entries.every(([, v]) => v.isOpen?.())
  }

  function openNextVisibleUnopened() {
    const entries = getVisibleEntriesSorted()
    const target = entries.find(([, v]) => !v.isOpen?.()) || entries[0]
    if (!target) return false
    target[1].open?.()
    return true
  }

  function openAllVisible() {
    const entries = getVisibleEntriesSorted()
    let count = 0
    for (const [, v] of entries) if (!v.isOpen?.()) { v.open?.(); count++ }
    return count > 0
  }

  // ---------- DOWN-only interception ----------
  const lastTriggerRef = useRef(0)
  const TRIGGER_COOLDOWN_MS = 220

  function shouldInterceptDown() {
    if (!hasVisibleDots()) return false
    if (areAllVisibleOpen()) return false
    return true
  }

  function tryTriggerOpen() {
    const now = Date.now()
    if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) return
    lastTriggerRef.current = now
    if (openOnDown === "all") openAllVisible()
    else openNextVisibleUnopened()
  }

  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented) return
      if (e.key !== "ArrowDown") return
      if (!shouldInterceptDown()) return
      // Steal priority
      e.preventDefault()
      e.stopImmediatePropagation?.()
      e.stopPropagation()
      tryTriggerOpen()
    }

    function onWheel(e) {
      if (e.defaultPrevented) return
      // Only down direction; ignore pinch zoom or horizontal
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      if (e.deltaY <= 0) return
      if (!shouldInterceptDown()) return
      // Steal priority
      e.preventDefault()
      e.stopImmediatePropagation?.()
      e.stopPropagation()
      tryTriggerOpen()
    }

    // Capture early, and passive: false so we can preventDefault on wheel
    window.addEventListener("keydown", onKey, { capture: true })
    window.addEventListener("wheel", onWheel, { capture: true, passive: false })
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true })
      window.removeEventListener("wheel", onWheel, { capture: true })
    }
  }, [openOnDown])

  // ---------- Overlay plumbing (optional) ----------
  const internalBaseRef = useRef(null)
  const targetBaseRef = baseRef ?? internalBaseRef

  const animTokenRef = useRef(0)
  const cleanupTimerRef = useRef(0)
  const BASE_Z_SENTINEL = "data-gd-base-z"

  function ensureBaseBaseline(el) {
    if (!el) return
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

  const [overlay, setOverlay] = useState({ node: null, visible: false, transition: "slide-in", key: 0, zIndex: 101, effect: "slide-in" })

  function computeModes(effect) {
    if (effect === "slide-in")  return { effect, overlayName: "slide-in", baseMode: "neutral",   zIndex: 101 }
    if (effect === "slide-out") return { effect, overlayName: "behind",   baseMode: "slide-out", zIndex: 0 }
    if (effect === "zoom-in")   return { effect, overlayName: "fade-in",  baseMode: "zoom-in",   zIndex: 101 }
    if (effect === "zoom-out")  return { effect, overlayName: "fade-in",  baseMode: "zoom-out",  zIndex: 101 }
    return { effect: "slide-in", overlayName: "slide-in", baseMode: "neutral", zIndex: 101 }
  }

  function dur(effect) {
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

  function animateBase(baseMode, token, effectName) {
    const el = targetBaseRef.current
    if (!el) return
    if (baseMode === "neutral") { ensureBaseBaseline(el); return }
    const D = dur(effectName)
    const prevZ = el.style.zIndex
    if (!prevZ) { el.style.zIndex = "10"; el.setAttribute(BASE_Z_SENTINEL, "1") }
    el.style.transitionProperty = "transform, opacity"
    el.style.transitionTimingFunction = easing
    el.style.transitionDuration = `${D}ms`
    el.style.willChange = "transform, opacity"
    el.style.backfaceVisibility = "hidden"
    el.style.pointerEvents = ""
    el.style.transform = "none"
    el.style.opacity = "1"
    requestAnimationFrame(() => {
      if (animTokenRef.current !== token) return
      requestAnimationFrame(() => {
        if (animTokenRef.current !== token) return
        if (baseMode === "slide-out") { el.style.transform = "translateX(100%)"; el.style.opacity = "1" }
        else if (baseMode === "zoom-in") { el.style.transform = `scale(${zoomScaleIn})`; el.style.opacity = "0" }
        else if (baseMode === "zoom-out") { el.style.transform = `scale(${zoomScaleOut})`; el.style.opacity = "0" }
      })
    })
    if (baseMode === "slide-out" || baseMode === "zoom-in" || baseMode === "zoom-out") {
      if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = window.setTimeout(() => {
        if (animTokenRef.current !== token) return
        el.style.pointerEvents = "none"
        cleanupTimerRef.current = 0
      }, dur(effectName) + 20)
    }
  }

  function presentOverlay(whichTransition, nodeOrComponent) {
    const node = typeof nodeOrComponent === "function" ? nodeOrComponent() : nodeOrComponent
    if (!node) return false
    const { effect, overlayName, baseMode, zIndex } = computeModes(whichTransition)
    const token = ++animTokenRef.current
    if (cleanupTimerRef.current) { clearTimeout(cleanupTimerRef.current); cleanupTimerRef.current = 0 }
    if (baseMode === "neutral") ensureBaseBaseline(targetBaseRef.current)
    const startVisible = overlayName === "behind"
    setOverlay(prev => ({ node, visible: startVisible, transition: overlayName, key: prev.key + 1, zIndex, effect }))
    if (overlayName === "behind") animateBase(baseMode, token, effect)
    else {
      requestAnimationFrame(() => {
        if (animTokenRef.current !== token) return
        requestAnimationFrame(() => {
          if (animTokenRef.current !== token) return
          setOverlay(prev => ({ ...prev, visible: true }))
          if (baseMode !== "neutral") animateBase(baseMode, token, effect)
        })
      })
    }
    return true
  }

  function replaceOverlay(whichTransition, nodeOrComponent) { return presentOverlay(whichTransition, nodeOrComponent) }
  function dismissOverlay() { ensureBaseBaseline(targetBaseRef.current); setOverlay(prev => ({ ...prev, node: null, visible: false })) }

  const overlayPortal = overlay.node
    ? createPortal(
        <div className="gd-overlay" style={overlayStyle(overlay.visible, overlay.transition, overlay.zIndex, overlay.effect)} key={overlay.key}>
          <div className="h-full w-full bg-transparent">{overlay.node}</div>
        </div>,
        document.body
      )
    : null

  function overlayStyle(visible, overlayName, zIndex, effectName) {
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
      backfaceVisibility: "hidden",
      transformStyle: "preserve-3d",
      contain: "paint",
    }
    if (overlayName === "slide-in") { style.transform = visible ? "translateX(0)" : "translateX(-100%)"; style.opacity = 1 }
    else if (overlayName === "reveal") { style.transform = "translateX(0)"; style.opacity = visible ? 1 : 0 }
    else if (overlayName === "behind") { style.transform = "none"; style.opacity = 1 }
    else { style.transform = "translateZ(0)"; style.opacity = visible ? 1 : 0 }
    return style
  }

  useEffect(() => () => { if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current) }, [])

  // ---------- Context ----------
  const value = useMemo(() => ({
    register,
    setVisible,
    threshold,
    presentOverlay,
    replaceOverlay,
    dismissOverlay,
  }), [threshold])

  return (
    <GlowDotCtx.Provider value={value}>
      <div ref={baseRef ? undefined : internalBaseRef}>{children}</div>
      {overlayPortal}
    </GlowDotCtx.Provider>
  )
}

export function useGlowDotController() {
  const ctx = useContext(GlowDotCtx)
  if (!ctx) throw new Error("useGlowDotController must be used inside <GlowDotProvider>")
  return ctx
}
