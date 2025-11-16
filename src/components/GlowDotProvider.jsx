// GlowDotProvider.jsx
import { createContext, useCallback, useContext, useMemo, useRef, useEffect } from "react"

const GlowDotCtx = createContext(null)

/**
 * GlowDotProvider — registry + visibility tracking for GlowDots.
 *
 * Now: when at least one dot becomes visible, all visible dots are opened
 * sequentially in ascending order of ID.
 */
export function GlowDotProvider({
  children,
  threshold = 0.3, // kept for compatibility with GlowDot
}) {
  // Registry of dots: id -> { isVisible: boolean, isOpen(): boolean, open(): void, close(): void }
  const registryRef = useRef(new Map())

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

  // --- sequential opener state ---
  const sequenceRef = useRef({ running: false, timer: null })
  const FIRST_SEQUENCE_DELAY_MS = 1000   // slight delay before first dot opens
  const SEQUENCE_DELAY_MS = 1000         // delay between subsequent dots

  const startSequentialOpen = useCallback(() => {
    if (sequenceRef.current.running) return
    sequenceRef.current.running = true

    const step = () => {
      const didOpen = openNextVisibleUnopened()
      if (!didOpen || areAllVisibleOpen()) {
        sequenceRef.current.running = false
        sequenceRef.current.timer = null
        return
      }
      sequenceRef.current.timer = setTimeout(step, SEQUENCE_DELAY_MS)
    }

    // slight delay before opening the very first visible dot
    sequenceRef.current.timer = setTimeout(step, FIRST_SEQUENCE_DELAY_MS)
  }, [openNextVisibleUnopened, areAllVisibleOpen])


  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (sequenceRef.current.timer) {
        clearTimeout(sequenceRef.current.timer)
      }
      sequenceRef.current.running = false
      sequenceRef.current.timer = null
    }
  }, [])

  const register = useCallback((id, controls) => {
    if (!id) return () => {}
    const prev = registryRef.current.get(id) || { isVisible: false }
    registryRef.current.set(id, {
      ...prev,
      ...controls,
    })
    return () => {
      registryRef.current.delete(id)
    }
  }, [])

  const unregister = useCallback((id) => {
    registryRef.current.delete(id)
  }, [])

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
  }, [hasVisibleDots, startSequentialOpen])

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

    // props (for consumers that want to read them)
    threshold,

    // provider always considered "active" now
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
