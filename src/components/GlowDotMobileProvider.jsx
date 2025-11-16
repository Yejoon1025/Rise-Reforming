// GlowDotMobileProvider.jsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react"

const GlowDotCtx = createContext(null)

/**
 * GlowDotMobileProvider
 *
 * Simplified mobile provider:
 * - Tracks glow-dot registration and visibility.
 * - NO scroll / ArrowDown / touch interception.
 * - Still exposes helper methods in case other code calls them.
 */
export function GlowDotMobileProvider({
  children,
  threshold = 0.3,
  // kept for API compatibility, but no longer used internally
  openOnDown = "next",
}) {
  // id -> { isVisible: boolean, isOpen(): boolean, open(): void, close(): void }
  const registryRef = useRef(new Map())

  // ----- Registry helpers -----
  const register = useCallback((id, controls) => {
    const entry =
      registryRef.current.get(id) || {
        isVisible: false,
        isOpen: () => false,
        open: () => {},
        close: () => {},
      }

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
    if (!prev) {
      registryRef.current.set(id, {
        isVisible: !!isVisible,
        isOpen: () => false,
        open: () => {},
        close: () => {},
      })
    } else {
      prev.isVisible = !!isVisible
    }
  }, [])

  const getVisibleEntriesSorted = useCallback(() => {
    const out = []
    for (const [id, v] of registryRef.current.entries()) {
      if (v?.isVisible) out.push([id, v])
    }
    return out
  }, [])

  const hasVisibleDots = useCallback(
    () => getVisibleEntriesSorted().length > 0,
    [getVisibleEntriesSorted]
  )

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

  // Kept for compatibility; you *can* call this manually if needed.
  const tryTriggerOpen = useCallback(() => {
    if (openOnDown === "all") openAllVisible()
    else openNextVisibleUnopened()
  }, [openAllVisible, openNextVisibleUnopened, openOnDown])

  // Overlay compatibility (no-ops)
  const presentOverlay = useCallback(() => false, [])
  const replaceOverlay = useCallback(() => false, [])
  const dismissOverlay = useCallback(() => {}, [])

  // Always "active" now (no viewport guard)
  const isProviderActive = useCallback(() => true, [])

  const value = useMemo(
    () => ({
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

      // props / state
      threshold,
      openOnDown,
      isProviderActive,
    }),
    [
      register,
      unregister,
      setVisible,
      hasVisibleDots,
      areAllVisibleOpen,
      openNextVisibleUnopened,
      openAllVisible,
      tryTriggerOpen,
      presentOverlay,
      replaceOverlay,
      dismissOverlay,
      threshold,
      openOnDown,
      isProviderActive,
    ]
  )

  return (
    <GlowDotCtx.Provider value={value}>
      {children}
    </GlowDotCtx.Provider>
  )
}

export function useGlowDotController() {
  const ctx = useContext(GlowDotCtx)
  if (!ctx) {
    throw new Error(
      "useGlowDotController must be used inside <GlowDotMobileProvider>"
    )
  }
  return ctx
}
