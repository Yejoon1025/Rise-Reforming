// TransitionsPagerPage.jsx
// Vite + React + Tailwind v4 — single-file page export.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import TechOne from '../screens/TechOne.jsx'
import { TechTwo } from '../screens/TechTwo.jsx'
import TechOverlayOne from '../screens/TechOverlayOne.jsx'
import TechOverlayTwo from '../screens/TechOverlayTwo.jsx'
import * as T from '../components/Transitions.jsx'
import { ChevronRight } from 'lucide-react'
const TRANSITIONS = { ...T }

// ---- CODE CONFIG (code-side "menu") ---------------------------------
const PAGE_TRANSITIONS = {
  screen1: { down: 'crossFade' },      // Screen1-group → Screen2
  screen2: { up: 'crossFade' }
}
// --- DOTS: labels/targets + per-dot transition you want to use on click ---
const DOT_SECTIONS = [
  { id: 1, label: "Chemistry", target: 1 }, // overlay2 (bright)
  { id: 2, label: 'Process', target: 2 },
]

// Choose what animation should happen when clicking each dot.
// Use names from your TRANSITIONS export (e.g., 'slideIn', 'slideOut', 'zoomIn', 'zoomOut').
// Special case: when going 0 -> 1, we use the overlay mover (overlaySlide) regardless.
const DOT_TRANSITIONS = {
  1: 'crossFade', // any non-overlay → overlay2
  2: 'crossFade',
}
// --------------------------------------------------------------------

const DURATION_MS = 800 // unified guard duration; align with runner timings

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
    return () => { clearTimeout(t); release() }
  }, [])

  return { isAnimating, start }
}

// === NEW: overlay slide that emulates your example ===================
// Uses a single mover that contains both overlays stacked vertically.
// We translate the mover between 0 and -100% of viewport height.
// Bright image fades in/out at the same time.
function overlaySlide({ moverEl, direction = 'down', brightEl, onDone }) {
  if (!moverEl) { onDone && onDone(); return }

  // Ensure transition classes exist
  moverEl.classList.add('transition-transform','duration-700','ease-out')

  // Bright image fade sync
  if (brightEl) {
    brightEl.classList.add('transition-opacity','duration-700','ease-out')
    if (direction === 'down') {
      brightEl.classList.remove('opacity-0')
      brightEl.classList.add('opacity-100')
    } else {
      brightEl.classList.remove('opacity-100')
      brightEl.classList.add('opacity-0')
    }
  }

  // Start position assumed to match current visual state.
  // Animate mover to target state.
  requestAnimationFrame(() => {
    if (direction === 'down') {
      // overlay1 -> overlay2
      moverEl.classList.remove('translate-y-0')
      moverEl.classList.add('-translate-y-full')
    } else {
      // overlay2 -> overlay1
      moverEl.classList.remove('-translate-y-full')
      moverEl.classList.add('translate-y-0')
    }
  })

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    // Keep classes for resting state; no hidden toggles needed.
    onDone && onDone()
  }

  moverEl.addEventListener('transitionend', finish, { once: true })
  setTimeout(finish, DURATION_MS + 200) // fallback
}
// =====================================================================

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
  fn({ fromRef: fromEl, toRef: toEl, onDone: () => { clearTimeout(t); finish() } })
}

// ROUTE INDEX:
// 0 = overlay1, 1 = overlay2, 2 = screen2
export default function Tecyh() {
    const navigate = useNavigate();

  // Screen 1 GROUP (moves as one)
  const s1GroupRef = useRef(null)

  // Group internals
  const baseS1Ref = useRef(null)
  const brightRef = useRef(null)

  // Overlay mover (contains both overlays, stacked vertically)
  const overlayMoverRef = useRef(null)

  // Other screens
  const s2Ref = useRef(null)

  const containerRef = useRef(null)

  const [at, setAt] = useState(0)
  const { isAnimating, start } = useAnimLock()

  // Map an index to its root element
  function getRefFor(idx) {
    if (idx === 0 || idx === 1) return s1GroupRef.current // overlay1/overlay2 live in the S1 group
    if (idx === 2) return s2Ref.current
    return null
  }

  // Prep Screen 1 group so that when it becomes visible, it's already at overlay2 (bright shown)
  function prepS1ForOverlay2() {
    // show the S1 group container
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

    // mover at overlay2 (up) & bright visible
    overlayMoverRef.current?.classList.add('-translate-y-full')
    overlayMoverRef.current?.classList.remove('translate-y-0')
    brightRef.current?.classList.add('opacity-100')
    brightRef.current?.classList.remove('opacity-0')
  }

  // Direct, single-step transition on dot click (no chaining)
  const directTo = useCallback((target) => {
    if (![1,2].includes(target)) return
    if (target === at) return

    const finishLock = start()
    if (!finishLock) return

    const fromEl = getRefFor(at)

    // Special: overlay1 (0) -> overlay2 (1) uses the mover slide (matches your overlay behavior)
    if (at === 0 && target === 1) {
      overlaySlide({
        moverEl: overlayMoverRef.current,
        brightEl: brightRef.current,
        direction: 'down',
        onDone: () => { setAt(1); finishLock() }
      })
      return
    }

    // Prepare destination screen
    const toEl = getRefFor(target)
    if (target === 1) prepS1ForOverlay2() // make sure overlay2 is the visible state

    // Pick the single transition to use (per-dot). Defaults to 'slideIn' if unknown.
    const chosen = DOT_TRANSITIONS[target] || 'slideIn'

    // Show target (if your transition needs it) and run one transition
    toEl?.classList.remove('hidden')
    runTransition({
      name: chosen,
      fromEl,
      toEl,
      onDone: () => {
        // Hide non-target screens defensively
        if (target !== 2) s2Ref.current?.classList.add('hidden')
        if (target !== 1) s1GroupRef.current?.classList.add('hidden')
        setAt(target)
        finishLock()
      }
    })
  }, [at, start])

  // Jump helper: set DOM to the correct resting state for a target index.
  // Targets: 1 = overlay2, 2 = screen2.
  // When at === 0 (first overlay), all dots render empty (no "active" dot).
  const jumpTo = (target) => {
    if (![1,2].includes(target)) return

    // Hide everything first
    s1GroupRef.current?.classList.add('hidden')
    s2Ref.current?.classList.add('hidden')

    // Reset bright/overlay mover to a safe baseline
    if (brightRef.current) {
      brightRef.current.classList.remove('transition-opacity','duration-700','ease-out')
    }
    if (overlayMoverRef.current) {
      overlayMoverRef.current.classList.remove('transition-transform','duration-700','ease-out')
    }

    if (target === 1) {
      // Show Screen 1 group with overlay2 visible
      s1GroupRef.current?.classList.remove('hidden')
      baseS1Ref.current?.classList.remove('hidden')

      // mover at overlay2 (up) & bright visible
      overlayMoverRef.current?.classList.add('-translate-y-full')
      overlayMoverRef.current?.classList.remove('translate-y-0')

      brightRef.current?.classList.add('opacity-100')
      brightRef.current?.classList.remove('opacity-0')

      setAt(1)
      return
    }

    if (target === 2) {
      s2Ref.current?.classList.remove('hidden')
      // ensure bright is hidden to avoid ghosting
      brightRef.current?.classList.add('opacity-0')
      brightRef.current?.classList.remove('opacity-100')
      setAt(2)
      return
    }
  }

  // Which dot should appear “active”?
  // On first overlay (at === 0), return null so ALL dots appear empty.
  const activeDot = at === 0 ? null : at


  // Replace with your asset or import it
  const BRIGHT_IMAGE_SRC = '/TechOne.png'

  // Initial visibility
  useEffect(() => {
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

    s2Ref.current?.classList.add('hidden')

    // Bright image starts hidden at Overlay 1
    if (brightRef.current) {
      brightRef.current.classList.add('opacity-0')
      brightRef.current.classList.remove('opacity-100')
    }

    // Overlay mover starts at first overlay
    if (overlayMoverRef.current) {
      overlayMoverRef.current.classList.add('translate-y-0')
      overlayMoverRef.current.classList.remove('-translate-y-full')
    }

    containerRef.current?.focus()
  }, [])

  const goDown = useCallback(() => {
    const finishLock = start()
    if (!finishLock) return

    if (at === 0) {
      // overlay1 -> overlay2 (slide-reveal + fade-in bright)
      overlaySlide({
        moverEl: overlayMoverRef.current,
        brightEl: brightRef.current,
        direction: 'down',
        onDone: () => { setAt(1); finishLock() }
      })
      return
    }

    if (at === 1) {
      // Screen1 group (overlay2 visible) -> Screen2
      if (brightRef.current) {
        brightRef.current.classList.add('transition-opacity','duration-700','ease-out')
        brightRef.current.classList.remove('opacity-100')
        brightRef.current.classList.add('opacity-0')
      }
      runTransition({
        name: PAGE_TRANSITIONS.screen1.down,
        fromEl: s1GroupRef.current,
        toEl: s2Ref.current,
        onDone: () => { setAt(2); finishLock() }
      })
      return
    }

    finishLock()
  }, [at, start])

  const goUp = useCallback(() => {
    const finishLock = start()
    if (!finishLock) return

    if (at === 2) {
      // Prepare Screen1 group to show overlay2 on arrival
      if (overlayMoverRef.current) {
        overlayMoverRef.current.classList.add('-translate-y-full')
        overlayMoverRef.current.classList.remove('translate-y-0')
      }
      if (brightRef.current) {
        brightRef.current.classList.add('transition-opacity','duration-700','ease-out')
        brightRef.current.classList.remove('opacity-0')
        brightRef.current.classList.add('opacity-100')
      }
      runTransition({
        name: PAGE_TRANSITIONS.screen2.up,
        fromEl: s2Ref.current,
        toEl: s1GroupRef.current,
        onDone: () => { setAt(1); finishLock() }
      })
      return
    }

    if (at === 1) {
      // overlay2 -> overlay1 (slide-reveal back + fade-out bright)
      overlaySlide({
        moverEl: overlayMoverRef.current,
        brightEl: brightRef.current,
        direction: 'up',
        onDone: () => { setAt(0); finishLock() }
      })
      return
    }

    finishLock()
  }, [at, start])

  // Navigation input handlers (respect the single-flight lock)
  useEffect(() => {
    function onWheel(e) {
      if (isAnimating) return
      if (Math.abs(e.deltaY) < 20) return
      if (e.deltaY > 0) goDown()
      else goUp()
    }
    function onKeyNav(e) {
      if (isAnimating) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goDown() }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goUp() }
      if (e.key === 'ArrowRight' && at === 2) {e.preventDefault(); navigate('/team')}
    }
    const el = containerRef.current
    el?.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKeyNav, { passive: false })
    return () => {
      el?.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyNav)
    }
  }, [goDown, goUp, isAnimating])

  // Global blockers while animating (keys, wheel, touch)
  useEffect(() => {
    function block(e) {
      if (!isAnimating) return
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
  }, [isAnimating])

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
        {/* Screen 1 base */}
        <div ref={baseS1Ref} className="fixed inset-0">
          <TechOne />
        </div>

        {/* Bright image for overlay 1 ⇄ 2 */}
        <img
          ref={brightRef}
          src={BRIGHT_IMAGE_SRC}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 z-30 h-full w-full object-cover opacity-0 pointer-events-none select-none"
          loading="lazy"
        />

        {/* Overlays — single mover that slides like the example */}
        <div className="absolute inset-0 z-40 h-screen w-full overflow-hidden select-none pointer-events-auto">
          <div
            ref={overlayMoverRef}
            className="absolute inset-0 will-change-transform transition-transform duration-700 ease-out translate-y-0"
          >
            {/* Layer 1 */}
            <div className="relative h-screen w-full">
              <TechOverlayOne />
            </div>
            {/* Layer 2 */}
            <div className="relative h-screen w-full">
              <TechOverlayTwo containerRef={overlayMoverRef}/>
            </div>
          </div>
        </div>
      </div>

      {/* Screen 2 */}
      <div ref={s2Ref} className="fixed inset-0 hidden">
        <TechTwo />
      </div>

      {/* --- PROGRESS DOTS (TeamPage look/feel) --- */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col gap-6 z-[60]">
        {DOT_SECTIONS.map((s) => {
          const activeDot = at === 0 ? null : at // on overlay1, all dots are empty
          return (
            <div key={s.id} className="relative group flex items-center">
              {/* Hover label */}
              <span className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
                {s.label}
              </span>

              {/* Dot */}
              <button
                onClick={() => directTo(s.target)}
                aria-label={s.label}
                className={`w-4 h-4 rounded-full border-2 border-white transition-colors ${
                  activeDot === s.target ? 'bg-white' : 'bg-transparent'
                }`}
              />
            </div>
          )
        })}
      </div>
      {/* --- NEXT ARROW (visible only on 2nd screen) --- */}
<div
        className={`absolute bottom-8 right-8 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 2 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Hover label to the left, styled like dot labels */}
        <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
          Learn more about our team
        </span>

        {/* Chevron icon button */}
        <button
      onClick={() => navigate("/team")}
      aria-label="Continue"
      className="p-2 hover:opacity-80 transition-opacity"
    >
      <ChevronRight className="text-white animate-bounce-x" size={32} />

    </button>
      </div>
    </div>
  )
}