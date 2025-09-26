// GlowDotProvider.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"

const GlowDotCtx = createContext(null)

/**
 * GlowDotProvider �� DOWN scroll/arrow/touch interception for "glow dots".
 *
 * NEW: Viewport guard
 *  - The provider now observes its own tiny wrapper <div> with an IntersectionObserver.
 *  - Interception (wheel/touch/ArrowDown) only occurs while that wrapper is on screen.
 *  - When it leaves the viewport, interception is released (latches cleared).
 *
 * Wheel + Touch behavior (slowdown �� fast):
 *  - We maintain an EMA of vertical speed to estimate "scroll/gesture speed".
 *  - A gesture-triggered open is allowed only after we've detected a "slow" phase (EMA < SLOW_EMA),
 *    and then receive a "fast" event (instant |deltaY| >= FAST_INSTANT).
 *  - After each open, you must slow down again before another open can trigger.
 *  - If a dot becomes visible while scrolling/gesturing, we require a fresh slowdown after that visibility
 *    before any gesture-triggered open can occur (prevents same-gesture opens).
 *  - After all visible dots are open, we KEEP intercepting down gestures and only release
 *    interception after a slowdown is detected �� but only while the provider is on-screen.
 *
 * Keyboard behavior:
 *  - ArrowDown still triggers while there are visible unopened dots (not slowdown-gated),
 *    again only while the provider is on-screen.
 *
 * Props:
 *  - openOnDown: "next" | "all"   (default "next")
 *  - useViewportGuard: boolean    (default true) �� set false to restore pre-guard behavior
 *  - viewportThreshold: number    (default 0.05) �� IO threshold for "in view"
 *  - viewportRootMargin: string   (default "0px") �� IO rootMargin
 */
export function GlowDotMobileProvider({
  children,
  threshold = 0.3, // kept for compatibility
  openOnDown = "next",
  useViewportGuard = true,
  viewportThreshold = 0.05,
  viewportRootMargin = "0px",
}) {
  // ---- Registry of dots: id -> { isVisible: boolean, isOpen(): boolean, open(): void, close(): void }
  const registryRef = useRef(new Map())

  // Cooldown to avoid double-firing
  const lastTriggerRef = useRef(0)
  const TRIGGER_COOLDOWN_MS = 220

  // ----- Wheel/touch gating via slowdown/fast -----
  // When true, a *fast* wheel/touch event can trigger an open (only after we've slowed).
  const wheelReadyAfterSlowRef = useRef(true)

  // Keep intercepting events after all dots open, until a slowdown happens.
  const interceptHoldUntilSlowRef = useRef(false)

  // Latch: once we start intercepting in a gesture, keep it until conditions explicitly release it.
  const interceptLatchRef = useRef(false)

  // Speed estimation (EMA of vertical magnitude)
  const speedEmaRef = useRef(0)
  const lastWheelTsRef = useRef(0) // informational

  // ---- Touch tracking ----
  const touchActiveRef = useRef(false)
  const lastTouchYRef = useRef(0)
  const lastTouchXRef = useRef(0)

  // ---- Viewport guard ----
  const rootRef = useRef(null)
  const providerInViewRef = useRef(true) // default true (pre-guard parity); IO will update

  // ---- Tunable thresholds (feel free to tweak for your devices) ----
  const SPEED_EMA_ALPHA = 0.25     // 0.15��0.35 works well
  const SLOW_EMA = 20              // "slow" if EMA(|deltaY|) < 20
  const FAST_INSTANT = 40          // "fast" if current |deltaY| >= 40

  // ---------- Helpers ----------
  const isProviderActive = useCallback(() => {
    return useViewportGuard ? !!providerInViewRef.current : true
  }, [useViewportGuard])

  // ---------- Registry helpers ----------
  const register = useCallback((id, controls) => {
    // controls: { isOpen(): boolean, open(): void, close(): void }
    const entry = registryRef.current.get(id) || { isVisible: false, isOpen: () => false, open: () => {}, close: () => {} }
    registryRef.current.set(id, {
      ...entry,
      ...controls,
    })
    return () => {
      registryRef.current.delete(id)
    }
  }, [])

  const unregister = useCallback((id) => {
    registryRef.current.delete(id)
  }, [])

  const setVisible = useCallback((id, isVisible) => {
    const prev = registryRef.current.get(id)
    const prevVisible = !!prev?.isVisible

    if (!prev) {
      registryRef.current.set(id, { isVisible: !!isVisible, isOpen: () => false, open: () => {}, close: () => {} })
    } else {
      prev.isVisible = !!isVisible
    }

    // Require a fresh slowdown AFTER a dot first becomes visible (if it isn't already open).
    const nowEntry = registryRef.current.get(id)
    if (!!isVisible && !prevVisible) {
      const unopened = nowEntry?.isOpen ? !nowEntry.isOpen() : true
      if (unopened) {
        // Gate gesture-triggered opens until we detect a slowdown.
        wheelReadyAfterSlowRef.current = false
        // Consider we are in an active gesture; keep interception latched.
        interceptLatchRef.current = true
      }
    }
  }, [])

  // Insertion order is preserved; Map order ~= visual order unless replaced with DOM order.
  const getVisibleEntriesSorted = useCallback(() => {
    const out = []
    for (const [id, v] of registryRef.current.entries()) {
      if (v?.isVisible) out.push([id, v])
    }
    return out
  }, [])

  const hasVisibleDots = useCallback(() => {
    return getVisibleEntriesSorted().length > 0
  }, [getVisibleEntriesSorted])

  const areAllVisibleOpen = useCallback(() => {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false
    return entries.every(([, v]) => v.isOpen?.())
  }, [getVisibleEntriesSorted])

  const openAllVisible = useCallback(() => {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false
    let changed = false
    for (const [, v] of entries) {
      if (!v.isOpen?.()) {
        v.open?.()
        changed = true
      }
    }
    return changed
  }, [getVisibleEntriesSorted])

  const openNextVisibleUnopened = useCallback(() => {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false
    const target = entries.find(([, v]) => !v.isOpen?.()) || entries[0]
    if (!target) return false
    target[1].open?.()
    return true
  }, [getVisibleEntriesSorted])

  // ---------- Interception checks ----------
  // Keyboard path: intercept while there are visible unopened dots AND provider is on-screen
  const shouldInterceptKeyDown = useCallback(() => {
    return isProviderActive() && hasVisibleDots() && !areAllVisibleOpen()
  }, [isProviderActive, hasVisibleDots, areAllVisibleOpen])

  // Base condition for wheel/touch intercept (pre-latch) �� also require on-screen
  const baseShouldInterceptWheel = useCallback(() => {
    // Intercept while provider is on-screen AND there are visible dots and either:
    //  - not all are open, or
    //  - we are in the post-all-open hold (until slowdown releases it).
    return (
      isProviderActive() &&
      hasVisibleDots() &&
      (!areAllVisibleOpen() || interceptHoldUntilSlowRef.current)
    )
  }, [isProviderActive, hasVisibleDots, areAllVisibleOpen])

  // Wheel/touch path: use the latch OR the base condition
  const shouldInterceptWheelDown = useCallback(() => {
    return isProviderActive() && (interceptLatchRef.current || baseShouldInterceptWheel())
  }, [isProviderActive, baseShouldInterceptWheel])

  // ---------- Trigger logic ----------
  const tryTriggerOpen = useCallback(() => {
    const now = Date.now()
    if (now - lastTriggerRef.current < TRIGGER_COOLDOWN_MS) return
    lastTriggerRef.current = now

    if (openOnDown === "all") openAllVisible()
    else openNextVisibleUnopened()

    // After each open, require a slowdown before the next gesture-triggered open.
    wheelReadyAfterSlowRef.current = false

    // If that open resulted in "all visible are open", keep intercepting until a slowdown.
    if (areAllVisibleOpen()) {
      interceptHoldUntilSlowRef.current = true
      interceptLatchRef.current = true // keep interception latched until slowdown releases it
    }
  }, [openOnDown, openAllVisible, openNextVisibleUnopened, areAllVisibleOpen])

  // ---------- Viewport guard (IO) ----------
  useEffect(() => {
    if (!useViewportGuard) {
      providerInViewRef.current = true
      return
    }
    const el = rootRef.current
    if (!el) return

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const visible = !!entry?.isIntersecting && (entry.intersectionRatio ?? 0) > 0
        providerInViewRef.current = visible

        if (!visible) {
          // When we leave the viewport, drop interception so native scrolling works normally.
          interceptLatchRef.current = false
          interceptHoldUntilSlowRef.current = false
          // Reset gating so next time we come into view we require a slowdown again.
          wheelReadyAfterSlowRef.current = true
          // Soft reset speed estimator.
          speedEmaRef.current = 0
        }
      },
      { threshold: viewportThreshold, rootMargin: viewportRootMargin }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [useViewportGuard, viewportThreshold, viewportRootMargin])

  // ---------- Global input handlers ----------
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented) return
      if (!isProviderActive()) return
      if (e.key === "ArrowDown" && shouldInterceptKeyDown()) {
        e.preventDefault()
        e.stopImmediatePropagation?.()
        e.stopPropagation()
        tryTriggerOpen()
      }
    }

    function onWheel(e) {
      if (e.defaultPrevented) return
      if (!isProviderActive()) return

      // Only vertical down-scroll; ignore pinch/horizontal
      const absX = Math.abs(e.deltaX)
      const absY = Math.abs(e.deltaY)
      if (absY <= absX) return
      if (e.deltaY <= 0) return

      // --- Update speed estimate (EMA of |deltaY|) ---
      const now = performance.now()
      const prevEma = speedEmaRef.current || 0
      const ema = prevEma + (absY - prevEma) * SPEED_EMA_ALPHA
      speedEmaRef.current = ema
      lastWheelTsRef.current = now

      const slowed = ema < SLOW_EMA
      const fastNow = absY >= FAST_INSTANT

      // Ensure the post-all-open hold stays active until a slowdown is observed.
      if (interceptLatchRef.current && areAllVisibleOpen()) {
        interceptHoldUntilSlowRef.current = true
      }

      const willIntercept = shouldInterceptWheelDown()
      if (!willIntercept) return

      // Engage/maintain latch for the active gesture
      interceptLatchRef.current = true

      // Intercept all downscrolls while session is active
      e.preventDefault()
      e.stopImmediatePropagation?.()
      e.stopPropagation()

      // Slowdown �� ready; Fast �� trigger (if ready)
      if (slowed) {
        wheelReadyAfterSlowRef.current = true
        // If all are open and we're holding interception, a slowdown releases it (for future events).
        if (areAllVisibleOpen() && interceptHoldUntilSlowRef.current) {
          interceptHoldUntilSlowRef.current = false
          // Drop the latch so the *next* event (likely still slow) won't be intercepted.
          interceptLatchRef.current = false
          return // current event remains intercepted; release applies to subsequent events
        }
      } else if (fastNow && wheelReadyAfterSlowRef.current) {
        tryTriggerOpen()
        // Gate subsequent opens until another slowdown occurs.
        wheelReadyAfterSlowRef.current = false
      }
    }

    // ----- TAP / CLICK -----
    // Intercept a simple tap/click anywhere on screen while there's a visible unopened dot.
    // Mirrors downscroll interception but without slowdown gating.
    function onTap(e) {
      if (e.defaultPrevented) return
      if (!isProviderActive()) return
      // Only when at least one visible dot is unopened.
      if (!(hasVisibleDots() && !areAllVisibleOpen())) return

      // Intercept the tap so underlying UI doesn't react.
      e.preventDefault()
      e.stopImmediatePropagation?.()
      e.stopPropagation()

      // Open one (or all) per config and use the shared cooldown for the slight delay.
      tryTriggerOpen()
     // No latch is kept for taps; after the cooldown, taps pass through if nothing to open.
    }


    // ----- TOUCH (mobile) -----
    function onTouchStart(e) {
      if (e.defaultPrevented) return
      if (!isProviderActive()) return
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      touchActiveRef.current = true
      lastTouchYRef.current = t.clientY
      lastTouchXRef.current = t.clientX
      // Start each gesture with a fresh-ish EMA so slow phases can be detected reliably.
      speedEmaRef.current = 0
    }

    function onTouchMove(e) {
      if (e.defaultPrevented) return
      if (!isProviderActive()) return
      if (!touchActiveRef.current || e.touches.length !== 1) return

      const t = e.touches[0]
      const dy = lastTouchYRef.current - t.clientY // finger moving UP => dy > 0 (page would scroll DOWN)
      const dx = lastTouchXRef.current - t.clientX
      const absY = Math.abs(dy)
      const absX = Math.abs(dx)

      // Update last positions early for next frame
      lastTouchYRef.current = t.clientY
      lastTouchXRef.current = t.clientX

      // Only vertical down-scroll equivalent (finger moving up); ignore horizontal or upward page scroll (finger down)
      if (absY <= absX) return
      if (dy <= 0) return

      // --- Update speed estimate (EMA of |deltaY|) ---
      const prevEma = speedEmaRef.current || 0
      const ema = prevEma + (absY - prevEma) * SPEED_EMA_ALPHA
      speedEmaRef.current = ema

      const slowed = ema < SLOW_EMA
      const fastNow = absY >= FAST_INSTANT

      // Ensure the post-all-open hold stays active until a slowdown is observed.
      if (interceptLatchRef.current && areAllVisibleOpen()) {
        interceptHoldUntilSlowRef.current = true
      }

      const willIntercept = shouldInterceptWheelDown()
      if (!willIntercept) return

      // Engage/maintain latch for the active gesture
      interceptLatchRef.current = true

      // Intercept the native scroll while session is active
      // NOTE: touch listeners must be registered with { passive: false } to allow this.
      e.preventDefault()
      e.stopImmediatePropagation?.()
      e.stopPropagation()

      // Slowdown �� ready; Fast �� trigger (if ready)
      if (slowed) {
        wheelReadyAfterSlowRef.current = true
        if (areAllVisibleOpen() && interceptHoldUntilSlowRef.current) {
          interceptHoldUntilSlowRef.current = false
          interceptLatchRef.current = false
          return
        }
      } else if (fastNow && wheelReadyAfterSlowRef.current) {
        tryTriggerOpen()
        wheelReadyAfterSlowRef.current = false
      }
    }

    function onTouchEnd() {
      touchActiveRef.current = false
      // If we aren't explicitly holding until slowdown, drop the latch at end of gesture.
      if (!interceptHoldUntilSlowRef.current) {
        interceptLatchRef.current = false
      }
    }

    window.addEventListener("keydown", onKey, { capture: true })
    // passive: false is required so we can preventDefault on wheel/touch
    window.addEventListener("wheel", onWheel, { capture: true, passive: false })
    // Tap / Click (desktop & mobile after touchend)
    window.addEventListener("click", onTap, { capture: true })

    // Touch listeners for mobile
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: false })
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false })
    window.addEventListener("touchend", onTouchEnd, { capture: true })
    window.addEventListener("touchcancel", onTouchEnd, { capture: true })

    return () => {
      window.removeEventListener("keydown", onKey, { capture: true })
      window.removeEventListener("wheel", onWheel, { capture: true })
      window.removeEventListener("click", onTap, { capture: true })

      window.removeEventListener("touchstart", onTouchStart, { capture: true })
      window.removeEventListener("touchmove", onTouchMove, { capture: true })
      window.removeEventListener("touchend", onTouchEnd, { capture: true })
      window.removeEventListener("touchcancel", onTouchEnd, { capture: true })
    }
}, [isProviderActive, shouldInterceptKeyDown, shouldInterceptWheelDown, areAllVisibleOpen, tryTriggerOpen, hasVisibleDots])

  // ---------- Overlay compatibility (no-ops) ----------
  const presentOverlay = useCallback(() => false, [])
  const replaceOverlay = useCallback(() => false, [])
  const dismissOverlay = useCallback(() => {}, [])

  const value = useMemo(() => ({
    // registry
    register,
    unregister,
    setVisible,

    // queries & ops
    hasVisibleDots,
    areAllVisibleOpen,
    openNextVisibleUnopened,
    openAllVisible,

    // triggers
    tryTriggerOpen,

    // overlay compatibility
    presentOverlay,
    replaceOverlay,
    dismissOverlay,

    // props (for consumers that want to read them)
    threshold,
    openOnDown,

    // viewport state (exposed in case you need it elsewhere)
    isProviderActive,
  }), [
    register, unregister, setVisible,
    hasVisibleDots, areAllVisibleOpen,
    openNextVisibleUnopened, openAllVisible,
    tryTriggerOpen,
    presentOverlay, replaceOverlay, dismissOverlay,
    threshold, openOnDown,
    isProviderActive,
  ])

  return (
    <div ref={rootRef} data-glow-root>
      <GlowDotCtx.Provider value={value}>
        {children}
      </GlowDotCtx.Provider>
    </div>
  )
}

export function useGlowDotController() {
  const ctx = useContext(GlowDotCtx)
  if (!ctx) throw new Error("useGlowDotController must be used inside <GlowDotProvider>")
  return ctx
}