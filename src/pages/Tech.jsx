// Tech.jsx
// Vite + React + Tailwind v4 — single-file page export.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import TechOne from '../screens/TechOne.jsx'
import { TechThree } from '../screens/TechThree.jsx'
import { TechFour } from '../screens/TechFour.jsx'
import { TechFive } from '../screens/TechFive.jsx'
import TechOverlayOne from '../screens/TechOverlayOne.jsx'
import TechOverlayTwo from '../screens/TechOverlayTwo.jsx'
import TechOverlayThree from '../screens/TechOverlayThree.jsx'
import * as T from '../components/Transitions.jsx'
import { ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import Bright from '../assets/TechOne.png'

// NEW: listen to GlowDotProvider global open lifecycle events
import {
  GLOWDOTS_OPENING_STARTED_EVENT,
  GLOWDOTS_OPENING_FINISHED_EVENT,
} from '../components/GlowDotProvider.jsx'

const TRANSITIONS = { ...T }

// ---- CODE CONFIG (code-side "menu") ---------------------------------
// Page indices:
// 0 = overlay1, 1 = overlay2, 2 = overlay3, 3 = screen3, 4 = screen4, 5 = screen5
const PAGE_TRANSITION_DEFAULT = 'crossFade'

// --- DOTS: labels/targets + per-dot transition you want to use on click ---
// Dots intentionally map to pages 1..5 (overlay1 has no dot).
const DOT_SECTIONS = [
  { id: 1, label: 'Chemical Process', target: 1 }, // overlay2 (bright)
  { id: 2, label: 'Competitive Advantage', target: 2 }, // overlay3 (was Screen 2)
  { id: 3, label: 'Price Competitive', target: 3 },
  { id: 4, label: 'Modular', target: 4 },
  { id: 5, label: 'Climate Positive', target: 5 },
]

// Choose what animation should happen when clicking each dot.
const DOT_TRANSITIONS = {
  1: 'crossFade',
  2: 'crossFade',
  3: 'crossFade',
  4: 'crossFade',
  5: 'crossFade',
}
// --------------------------------------------------------------------

const DURATION_MS = 1500 // unified guard duration; align with runner timings

// Single-flight lock to prevent input spam
function useAnimLock() {
  const latchRef = useRef(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const start = useCallback((timeoutMs = DURATION_MS) => {
    if (latchRef.current) return null
    latchRef.current = true
    setIsAnimating(true)
    let done = false
    const release = () => {
      if (done) return
      done = true
      latchRef.current = false
      setIsAnimating(false)
    }
    const t = setTimeout(release, timeoutMs + 200)
    return () => {
      clearTimeout(t)
      release()
    }
  }, [])

  return { isAnimating, start }
}

// === overlay slide ===================================================
// Uses a single mover that contains overlays stacked vertically.
// Now supports 3 overlay positions: 0, -100%, -200% viewport heights.
function overlaySlideTo({ moverEl, toIndex = 0, brightEl, onDone }) {
  if (!moverEl) {
    onDone && onDone()
    return
  }

  moverEl.classList.add('transition-transform', 'duration-700', 'ease-out')

  // Bright behavior kept the same conceptually:
  // visible only on overlay2 (index 1), hidden otherwise.
  if (brightEl) {
    brightEl.classList.add('transition-opacity', 'duration-700', 'ease-out')
    if (toIndex === 1) {
      brightEl.classList.remove('opacity-0')
      brightEl.classList.add('opacity-100')
    } else {
      brightEl.classList.remove('opacity-100')
      brightEl.classList.add('opacity-0')
    }
  }

  requestAnimationFrame(() => {
    // Clear any previous translate state we manage
    moverEl.classList.remove('translate-y-0', '-translate-y-full', '-translate-y-[200%]')

    if (toIndex === 0) moverEl.classList.add('translate-y-0')
    else if (toIndex === 1) moverEl.classList.add('-translate-y-full')
    else moverEl.classList.add('-translate-y-[200%]')
  })

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    onDone && onDone()
  }

  moverEl.addEventListener('transitionend', finish, { once: true })
  setTimeout(finish, DURATION_MS + 200)
}

// Transition runner with fallback
function runTransition({ name, fromEl, toEl, onDone }) {
  const fn = TRANSITIONS?.[name]
  if (typeof fn !== 'function') {
    toEl?.classList.remove('hidden')
    fromEl?.classList.add('hidden')
    onDone && onDone()
    return
  }
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    onDone && onDone()
  }
  const t = setTimeout(finish, DURATION_MS + 400)
  fn({
    fromRef: fromEl,
    toRef: toEl,
    onDone: () => {
      clearTimeout(t)
      finish()
    },
  })
}

// ROUTE INDEX:
// 0 = overlay1, 1 = overlay2, 2 = overlay3, 3 = screen3, 4 = screen4, 5 = screen5
export default function Tecyh() {
  const navigate = useNavigate()

  // Screen 1 GROUP (moves as one)
  const s1GroupRef = useRef(null)

  // Group internals
  const baseS1Ref = useRef(null)
  const brightRef = useRef(null)

  // Overlay mover (contains overlays stacked vertically)
  const overlayMoverRef = useRef(null)

  // Other screens (screen2 removed; it is now overlay3 inside the mover)
  const s3Ref = useRef(null)
  const s4Ref = useRef(null)
  const s5Ref = useRef(null)

  const containerRef = useRef(null)

  const [at, setAt] = useState(0)
  const { isAnimating, start } = useAnimLock()

  // hide arrows & disable key nav only while *sequential* opening is actually running
  const [isSequentialOpening, setIsSequentialOpening] = useState(false)

  // Map an index to its root element
  function getRefFor(idx) {
    if (idx === 0 || idx === 1 || idx === 2) return s1GroupRef.current
    if (idx === 3) return s3Ref.current
    if (idx === 4) return s4Ref.current
    if (idx === 5) return s5Ref.current
    return null
  }

  function hideAllExcept(target) {
    const refs = [s1GroupRef, s3Ref, s4Ref, s5Ref]
    refs.forEach((r) => {
      const el = r.current
      if (!el) return
      const shouldShow =
        (target === 0 || target === 1 || target === 2) ? el === s1GroupRef.current : el === getRefFor(target)
      if (shouldShow) el.classList.remove('hidden')
      else el.classList.add('hidden')
    })
  }

  // Prep Screen 1 group so that when it becomes visible, it's already at overlay2 (bright shown)
  function prepS1ForOverlay2() {
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

    overlayMoverRef.current?.classList.remove('translate-y-0', '-translate-y-[200%]')
    overlayMoverRef.current?.classList.add('-translate-y-full')

    brightRef.current?.classList.add('opacity-100')
    brightRef.current?.classList.remove('opacity-0')
  }

  // Prep Screen 1 group so that when it becomes visible, it's already at overlay3 (bright hidden)
  function prepS1ForOverlay3() {
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

    overlayMoverRef.current?.classList.remove('translate-y-0', '-translate-y-full')
    overlayMoverRef.current?.classList.add('-translate-y-[200%]')

    brightRef.current?.classList.add('opacity-0')
    brightRef.current?.classList.remove('opacity-100')
  }

  // Direct, single-step transition on dot click (no chaining)
  const directTo = useCallback(
    (target) => {
      if (![1, 2, 3, 4, 5].includes(target)) return
      if (target === at) return

      const finishLock = start()
      if (!finishLock) return

      const fromEl = getRefFor(at)

      // Any move that targets overlay2/overlay3 is handled by showing S1 group and sliding mover.
      if (target === 1 || target === 2) {
        if (target === 1) prepS1ForOverlay2()
        else prepS1ForOverlay3()

        // If we're coming from within the overlay group, do an overlay slide to the correct position.
        // If we're coming from another screen, we keep your existing crossFade into the group.
        const comingFromGroup = at === 0 || at === 1 || at === 2
        if (comingFromGroup) {
          overlaySlideTo({
            moverEl: overlayMoverRef.current,
            toIndex: target, // 1 or 2
            brightEl: brightRef.current,
            onDone: () => {
              setAt(target)
              finishLock()
            },
          })
          return
        }

        const toEl = getRefFor(target) // s1GroupRef
        const chosen = DOT_TRANSITIONS[target] || PAGE_TRANSITION_DEFAULT

        toEl?.classList.remove('hidden')
        runTransition({
          name: chosen,
          fromEl,
          toEl,
          onDone: () => {
            hideAllExcept(target)
            setAt(target)
            finishLock()
          },
        })
        return
      }

      // Otherwise, normal screen transitions (3..5)
      const toEl = getRefFor(target)
      toEl?.classList.remove('hidden')

      const chosen = DOT_TRANSITIONS[target] || PAGE_TRANSITION_DEFAULT

      runTransition({
        name: chosen,
        fromEl,
        toEl,
        onDone: () => {
          hideAllExcept(target)
          setAt(target)
          finishLock()
        },
      })
    },
    [at, start]
  )

  // Initial visibility
  useEffect(() => {
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

    s3Ref.current?.classList.add('hidden')
    s4Ref.current?.classList.add('hidden')
    s5Ref.current?.classList.add('hidden')

    if (brightRef.current) {
      brightRef.current.classList.add('opacity-0')
      brightRef.current.classList.remove('opacity-100')
    }

    if (overlayMoverRef.current) {
      overlayMoverRef.current.classList.add('translate-y-0')
      overlayMoverRef.current.classList.remove('-translate-y-full', '-translate-y-[200%]')
    }

    containerRef.current?.focus()
  }, [])

  // listen for sequential opening lifecycle and hide arrows only during it.
  useEffect(() => {
    function onOpeningStarted(e) {
      const reason = e?.detail?.reason
      if (reason === 'sequence-start') setIsSequentialOpening(true)
    }
    function onOpeningFinished(e) {
      const reason = e?.detail?.reason
      if (reason === 'sequence-finished') setIsSequentialOpening(false)
      if (reason && reason !== 'sequence-start') setIsSequentialOpening(false)
    }

    window.addEventListener(GLOWDOTS_OPENING_STARTED_EVENT, onOpeningStarted)
    window.addEventListener(GLOWDOTS_OPENING_FINISHED_EVENT, onOpeningFinished)
    return () => {
      window.removeEventListener(GLOWDOTS_OPENING_STARTED_EVENT, onOpeningStarted)
      window.removeEventListener(GLOWDOTS_OPENING_FINISHED_EVENT, onOpeningFinished)
    }
  }, [])

  const transitionToIndex = useCallback(
    ({ fromIdx, toIdx, beforeStart, afterDone }) => {
      const finishLock = start()
      if (!finishLock) return

      beforeStart && beforeStart()

      const fromEl = getRefFor(fromIdx)
      const toEl = getRefFor(toIdx)
      toEl?.classList.remove('hidden')

      runTransition({
        name: PAGE_TRANSITION_DEFAULT,
        fromEl,
        toEl,
        onDone: () => {
          hideAllExcept(toIdx)
          setAt(toIdx)
          afterDone && afterDone()
          finishLock()
        },
      })
    },
    [start]
  )

  const goDown = useCallback(() => {
    // 0 -> 1 : overlay slide to overlay2 (bright on)
    if (at === 0) {
      const finishLock = start()
      if (!finishLock) return
      overlaySlideTo({
        moverEl: overlayMoverRef.current,
        toIndex: 1,
        brightEl: brightRef.current,
        onDone: () => {
          setAt(1)
          finishLock()
        },
      })
      return
    }

    // 1 -> 2 : overlay slide to overlay3 (bright fades out)
    if (at === 1) {
      const finishLock = start()
      if (!finishLock) return
      overlaySlideTo({
        moverEl: overlayMoverRef.current,
        toIndex: 2,
        brightEl: brightRef.current,
        onDone: () => {
          setAt(2)
          finishLock()
        },
      })
      return
    }

    // 2 -> 3 : transition out of overlay group into screen3
    if (at === 2) {
      transitionToIndex({ fromIdx: 2, toIdx: 3 })
      return
    }

    if (at === 3) {
      transitionToIndex({ fromIdx: 3, toIdx: 4 })
      return
    }
    if (at === 4) {
      transitionToIndex({ fromIdx: 4, toIdx: 5 })
      return
    }

    // at === 5 : end
  }, [at, start, transitionToIndex])

  const goUp = useCallback(() => {
    // 5 -> 4
    if (at === 5) {
      transitionToIndex({ fromIdx: 5, toIdx: 4 })
      return
    }
    // 4 -> 3
    if (at === 4) {
      transitionToIndex({ fromIdx: 4, toIdx: 3 })
      return
    }
    // 3 -> 2 : return into overlay3 (prep mover at overlay3, bright hidden)
    if (at === 3) {
      transitionToIndex({
        fromIdx: 3,
        toIdx: 2,
        beforeStart: () => {
          prepS1ForOverlay3()
        },
      })
      return
    }

    // 2 -> 1 : overlay slide back to overlay2 (bright fades in)
    if (at === 2) {
      const finishLock = start()
      if (!finishLock) return
      overlaySlideTo({
        moverEl: overlayMoverRef.current,
        toIndex: 1,
        brightEl: brightRef.current,
        onDone: () => {
          setAt(1)
          finishLock()
        },
      })
      return
    }

    // 1 -> 0 : overlay slide up to overlay1 (bright off)
    if (at === 1) {
      const finishLock = start()
      if (!finishLock) return
      overlaySlideTo({
        moverEl: overlayMoverRef.current,
        toIndex: 0,
        brightEl: brightRef.current,
        onDone: () => {
          setAt(0)
          finishLock()
        },
      })
      return
    }

    // at === 0 : start
  }, [at, start, transitionToIndex])

  // Navigation input handlers
  useEffect(() => {
    function onKeyNav(e) {
      if (isSequentialOpening) return
      if (isAnimating) return

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goDown()
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goUp()
      }
      if (e.key === 'ArrowRight' && at === 5) {
        e.preventDefault()
        navigate('/team')
      }
    }
    window.addEventListener('keydown', onKeyNav, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyNav)
    }
  }, [goDown, goUp, isAnimating, isSequentialOpening, at, navigate])

  // Global blockers while animating OR during sequential opening
  useEffect(() => {
    function block(e) {
      if (!isAnimating && !isSequentialOpening) return

      e.preventDefault()
      e.stopPropagation()
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
    }
    const opts = { capture: true }
    const optsNP = { capture: true, passive: false }
    window.addEventListener('keydown', block, opts)
    window.addEventListener('keypress', block, opts)
    window.addEventListener('keyup', block, opts)
    window.addEventListener('wheel', block, optsNP)
    window.addEventListener('touchmove', block, optsNP)
    return () => {
      window.removeEventListener('keydown', block, opts)
      window.removeEventListener('keypress', block, opts)
      window.removeEventListener('keyup', block, opts)
      window.removeEventListener('wheel', block, optsNP)
      window.removeEventListener('touchmove', block, optsNP)
    }
  }, [isAnimating, isSequentialOpening])

  const arrowHideDuringSeq = isSequentialOpening ? 'opacity-0 pointer-events-none' : 'opacity-100'

  // Progress dots: active is 1..5 only (overlay1 has no active dot)
  const activeDot = at === 0 ? null : at

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="fixed inset-0 bg-[#0c1a22] text-white outline-none"
      aria-label="Transitions Pager"
      aria-busy={isAnimating ? 'true' : 'false'}
    >
      <Navbar />

      {/* Screen 1 GROUP */}
      <div ref={s1GroupRef} className="fixed inset-0">
        <div ref={baseS1Ref} className="fixed inset-0">
          <TechOne />
        </div>

        <img
          ref={brightRef}
          src={Bright}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 z-30 h-full w-full object-cover opacity-0 pointer-events-none select-none"
          loading="lazy"
        />

        <div className="absolute inset-0 z-40 h-screen w-full overflow-hidden select-none pointer-events-auto">
          <div
            ref={overlayMoverRef}
            className="absolute inset-0 will-change-transform transition-transform duration-700 ease-out translate-y-0"
          >
            <div className="relative h-screen w-full">
              <TechOverlayOne />
            </div>
            <div className="relative h-screen w-full">
              <TechOverlayTwo containerRef={overlayMoverRef} />
            </div>
            <div className="relative h-screen w-full">
              <TechOverlayThree />
            </div>
          </div>
        </div>
      </div>

      {/* Screen 3 */}
      <div ref={s3Ref} className="fixed inset-0 hidden">
        <TechThree />
      </div>

      {/* Screen 4 */}
      <div ref={s4Ref} className="fixed inset-0 hidden">
        <TechFour />
      </div>

      {/* Screen 5 */}
      <div ref={s5Ref} className="fixed inset-0 hidden">
        <TechFive />
      </div>

      {/* --- PROGRESS DOTS --- */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col gap-6 z-[60]">
        {DOT_SECTIONS.map((s) => (
          <div key={s.id} className="relative group flex items-center">
            <span className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
              {s.label}
            </span>

            <button
              onClick={() => directTo(s.target)}
              aria-label={s.label}
              className={`w-4 h-4 rounded-full border-2 border-white transition-colors ${
                activeDot === s.target ? 'bg-white' : 'bg-transparent'
              }`}
            />
          </div>
        ))}
      </div>

      {/* UP ARROW */}
      <div
        className={`absolute bottom-16 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 0 ? 'opacity-0 pointer-events-none' : arrowHideDuringSeq
        }`}
      >
        <button onClick={() => goUp()} aria-label="Up" className="p-2 hover:opacity-80 transition-opacity">
          <ChevronUp className="text-white" size={32} />
        </button>
      </div>

      {/* DOWN ARROW */}
      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 5 ? 'opacity-0 pointer-events-none' : arrowHideDuringSeq
        }`}
      >
        <button onClick={() => goDown()} aria-label="Down" className="p-2 hover:opacity-80 transition-opacity">
          <ChevronDown className="text-white" size={32} />
        </button>
      </div>

      {/* --- NEXT ARROW (visible only on LAST screen now) --- */}
      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 5 ? arrowHideDuringSeq : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
          Learn more about our team
        </span>

        <button onClick={() => navigate('/team')} aria-label="Continue" className="p-2 hover:opacity-80 transition-opacity">
          <ChevronRight className="text-white" size={32} />
        </button>
      </div>

      {at == 0 && (
        <div className="absolute bottom-11 right-18 z-[70] text-white/70 text-sm md:text-base animate-pulse select-none pointer-events-auto">
          Click or use arrow keys to navigate:
        </div>
      )}
    </div>
  )
}
