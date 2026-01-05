// GlowDotProvider.jsx
import { createContext, useCallback, useContext, useMemo, useRef, useEffect } from "react"

const GlowDotCtx = createContext(null)

// Existing global completion event (kept)
export const GLOWDOTS_ALL_VISIBLE_OPEN_EVENT = "glowdots:allVisibleOpen"

// NEW: global lifecycle events (parent pages can listen anywhere)
export const GLOWDOTS_OPENING_STARTED_EVENT = "glowdots:openingStarted"
export const GLOWDOTS_OPENING_FINISHED_EVENT = "glowdots:openingFinished"

/**
 * GlowDotProvider — registry + visibility tracking for GlowDots.
 *
 * When at least one dot becomes visible, all visible dots are opened
 * sequentially in ascending order of ID.
 *
 * Global events:
 * - glowdots:openingStarted (sequence/manual) — emitted only if there is actual work to do
 * - glowdots:openingFinished — emitted when all visible dots are open
 * - glowdots:allVisibleOpen — legacy "completion" event (kept)
 */
export function GlowDotProvider({
  children,
  threshold = 0.3,
}) {
  // id -> { isVisible: boolean, isOpen(): boolean, open(): void, close(): void }
  const registryRef = useRef(new Map())

  // Tracks last emitted "all visible open" state, so we only emit on transitions.
  const lastAllVisibleOpenRef = useRef(false)

  // Tracks whether we already emitted "openingStarted" for the current cycle
  const openingActiveRef = useRef(false)

  // --- helpers: visible entries sorted by ID ---
  const getVisibleEntriesSorted = useCallback(() => {
    const out = []
    for (const [id, v] of registryRef.current.entries()) {
      if (v?.isVisible) out.push([id, v])
    }

    // Sort by numeric ID if possible, otherwise lexicographic
    out.sort(([a], [b]) => {
      const na = Number(a)
      const nb = Number(b)
      const aNum = !Number.isNaN(na)
      const bNum = !Number.isNaN(nb)
      if (aNum && bNum) return na - nb
      return String(a).localeCompare(String(b))
    })

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

  const hasAnyVisibleUnopened = useCallback(() => {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false
    return entries.some(([, v]) => !v.isOpen?.())
  }, [getVisibleEntriesSorted])

  // --- global opening lifecycle emitters ---
  const emitOpeningStarted = useCallback((reason) => {
    if (openingActiveRef.current) return
    openingActiveRef.current = true

    const entries = getVisibleEntriesSorted()
    const visibleIds = entries.map(([id]) => id)

    if (typeof window !== "undefined" && window?.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent(GLOWDOTS_OPENING_STARTED_EVENT, {
          detail: {
            reason,       // "sequence-start" | "openAllVisible" | etc.
            visibleIds,
            timestamp: Date.now(),
          },
        })
      )
    }
  }, [getVisibleEntriesSorted])

  const emitOpeningFinished = useCallback((reason) => {
    if (typeof window !== "undefined" && window?.dispatchEvent) {
      const entries = getVisibleEntriesSorted()
      const visibleIds = entries.map(([id]) => id)

      window.dispatchEvent(
        new CustomEvent(GLOWDOTS_OPENING_FINISHED_EVENT, {
          detail: {
            reason,       // "sequence-finished" | "openAllVisible" | etc.
            visibleIds,
            timestamp: Date.now(),
          },
        })
      )
    }

    // Reset opening cycle latch
    openingActiveRef.current = false
  }, [getVisibleEntriesSorted])

  // --- existing completion event emitter (kept) ---
  const maybeEmitAllVisibleOpen = useCallback((reason = "unknown") => {
    const entries = getVisibleEntriesSorted()
    const visibleIds = entries.map(([id]) => id)

    const nowAllOpen = entries.length > 0 && entries.every(([, v]) => v.isOpen?.())
    const prevAllOpen = lastAllVisibleOpenRef.current

    // Only emit on transition false -> true
    if (!prevAllOpen && nowAllOpen) {
      lastAllVisibleOpenRef.current = true

      if (typeof window !== "undefined" && window?.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent(GLOWDOTS_ALL_VISIBLE_OPEN_EVENT, {
            detail: {
              reason,
              visibleIds,
              timestamp: Date.now(),
            },
          })
        )
      }

      // Also emit the "finished" lifecycle event on completion
      emitOpeningFinished(reason)
      return true
    }

    // If we were previously "all open" but now not, reset so a later completion can emit again.
    if (prevAllOpen && !nowAllOpen) {
      lastAllVisibleOpenRef.current = false
    }

    return false
  }, [getVisibleEntriesSorted, emitOpeningFinished])

  const openAllVisible = useCallback(() => {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false

    // Only treat as "opening" if there is actual work to do
    const hasWork = entries.some(([, v]) => !v.isOpen?.())
    if (hasWork) emitOpeningStarted("openAllVisible")

    let changed = false
    for (const [, v] of entries) {
      if (!v.isOpen?.()) {
        v.open?.()
        changed = true
      }
    }

    // After opening, see if we're now complete (this will emit finished)
    maybeEmitAllVisibleOpen("openAllVisible")
    return changed
  }, [getVisibleEntriesSorted, emitOpeningStarted, maybeEmitAllVisibleOpen])

  const openNextVisibleUnopened = useCallback(() => {
    const entries = getVisibleEntriesSorted()
    if (!entries.length) return false

    const target = entries.find(([, v]) => !v.isOpen?.())
    if (!target) return false

    target[1].open?.()

    // After opening one, check completion (this will emit finished when complete)
    maybeEmitAllVisibleOpen("openNextVisibleUnopened")
    return true
  }, [getVisibleEntriesSorted, maybeEmitAllVisibleOpen])

  // --- sequential opener state ---
  const sequenceRef = useRef({ running: false, timer: null })
  const FIRST_SEQUENCE_DELAY_MS = 1000
  const SEQUENCE_DELAY_MS = 1000

  const startSequentialOpen = useCallback(() => {
    if (sequenceRef.current.running) return

    // CRITICAL: if everything visible is already open, do NOT start a sequence and do NOT emit "openingStarted".
    if (!hasAnyVisibleUnopened()) {
      // Ensure completion state is consistent (and legacy completion event can re-fire later if invalidated)
      maybeEmitAllVisibleOpen("sequence-skip-already-open")
      return
    }

    sequenceRef.current.running = true
    emitOpeningStarted("sequence-start")

    const step = () => {
      const didOpen = openNextVisibleUnopened()

      // If nothing opened (or all are open), stop.
      if (!didOpen || areAllVisibleOpen()) {
        sequenceRef.current.running = false
        sequenceRef.current.timer = null

        // Ensure we emit if we ended because we are complete
        maybeEmitAllVisibleOpen("sequence-finished")
        return
      }

      sequenceRef.current.timer = setTimeout(step, SEQUENCE_DELAY_MS)
    }

    sequenceRef.current.timer = setTimeout(step, FIRST_SEQUENCE_DELAY_MS)
  }, [
    hasAnyVisibleUnopened,
    emitOpeningStarted,
    openNextVisibleUnopened,
    areAllVisibleOpen,
    maybeEmitAllVisibleOpen,
  ])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (sequenceRef.current.timer) {
        clearTimeout(sequenceRef.current.timer)
      }
      sequenceRef.current.running = false
      sequenceRef.current.timer = null
      openingActiveRef.current = false
    }
  }, [])

  const register = useCallback((id, controls) => {
    if (!id) return () => {}
    const prev = registryRef.current.get(id) || { isVisible: false }
    registryRef.current.set(id, {
      ...prev,
      ...controls,
    })

    // Registry changed; recompute completion state
    maybeEmitAllVisibleOpen("register")

    return () => {
      registryRef.current.delete(id)
      maybeEmitAllVisibleOpen("unregister-cleanup")
    }
  }, [maybeEmitAllVisibleOpen])

  const unregister = useCallback((id) => {
    registryRef.current.delete(id)
    maybeEmitAllVisibleOpen("unregister")
  }, [maybeEmitAllVisibleOpen])

  // When visibility changes, detect 0 → ≥1 and kick off the sequence
  const setVisible = useCallback((id, isVisible) => {
    if (!id) return

    const hadVisible = hasVisibleDots()

    const prev = registryRef.current.get(id) || {}
    registryRef.current.set(id, {
      ...prev,
      isVisible: !!isVisible,
    })

    const hasVisibleNow = hasVisibleDots()

    // Provider "becomes visible": at least one visible dot where previously there were none.
    if (!hadVisible && hasVisibleNow) {
      startSequentialOpen()
    }

    // Visibility changed; this can both (a) complete the set or (b) invalidate completion.
    maybeEmitAllVisibleOpen("visibility-change")
  }, [hasVisibleDots, startSequentialOpen, maybeEmitAllVisibleOpen])

  // Overlay compatibility stubs (no-ops)
  const presentOverlay = useCallback(() => false, [])
  const replaceOverlay = useCallback(() => false, [])
  const dismissOverlay = useCallback(() => {}, [])

  const isProviderActive = useCallback(() => true, [])

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

    // triggers (manual use only now)
    tryTriggerOpen: () => {
      openNextVisibleUnopened()
    },

    // overlay compatibility
    presentOverlay,
    replaceOverlay,
    dismissOverlay,

    // props
    threshold,

    isProviderActive,
  }), [
    register, unregister, setVisible,
    hasVisibleDots, areAllVisibleOpen,
    openNextVisibleUnopened, openAllVisible,
    presentOverlay, replaceOverlay, dismissOverlay,
    threshold,
    isProviderActive,
  ])

  return (
    <GlowDotCtx.Provider value={value}>
      {children}
    </GlowDotCtx.Provider>
  )
}

export function useGlowDotController() {
  const ctx = useContext(GlowDotCtx)
  if (!ctx) throw new Error("useGlowDotController must be used inside <GlowDotProvider>")
  return ctx
}
