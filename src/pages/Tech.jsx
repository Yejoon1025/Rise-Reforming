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
import { ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import Bright from '../assets/TechOne.png'

// NEW: listen to GlowDotProvider global open lifecycle events
import {
  GLOWDOTS_OPENING_STARTED_EVENT,
  GLOWDOTS_OPENING_FINISHED_EVENT,
} from '../components/GlowDotProvider.jsx'

const TRANSITIONS = { ...T }

// ---- CODE CONFIG (code-side "menu") ---------------------------------
const PAGE_TRANSITIONS = {
  screen1: { down: 'crossFade' },      // Screen1-group → Screen2
  screen2: { up: 'crossFade' }
}
// --- DOTS: labels/targets + per-dot transition you want to use on click ---
const DOT_SECTIONS = [
  { id: 1, label: "Chemical Process", target: 1 }, // overlay2 (bright)
  { id: 2, label: 'Competitive Advantages', target: 2 },
]

// Choose what animation should happen when clicking each dot.
const DOT_TRANSITIONS = {
  1: 'crossFade',
  2: 'crossFade',
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
    return () => { clearTimeout(t); release() }
  }, [])

  return { isAnimating, start }
}

// === overlay slide ===================================================
// Uses a single mover that contains both overlays stacked vertically.
// We translate the mover between 0 and -100% of viewport height.
// Bright image fades in/out at the same time.
function overlaySlide({ moverEl, direction = 'down', brightEl, onDone }) {
  if (!moverEl) { onDone && onDone(); return }

  moverEl.classList.add('transition-transform','duration-700','ease-out')

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

  requestAnimationFrame(() => {
    if (direction === 'down') {
      moverEl.classList.remove('translate-y-0')
      moverEl.classList.add('-translate-y-full')
    } else {
      moverEl.classList.remove('-translate-y-full')
      moverEl.classList.add('translate-y-0')
    }
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
  fn({ fromRef: fromEl, toRef: toEl, onDone: () => { clearTimeout(t); finish() } })
}

// ROUTE INDEX:
// 0 = overlay1, 1 = overlay2, 2 = screen2
export default function Tecyh() {
  const navigate = useNavigate()

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

  // NEW: hide arrows & disable key nav only while *sequential* opening is actually running
  const [isSequentialOpening, setIsSequentialOpening] = useState(false)

  // Map an index to its root element
  function getRefFor(idx) {
    if (idx === 0 || idx === 1) return s1GroupRef.current
    if (idx === 2) return s2Ref.current
    return null
  }

  // Prep Screen 1 group so that when it becomes visible, it's already at overlay2 (bright shown)
  function prepS1ForOverlay2() {
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

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

    if (at === 0 && target === 1) {
      overlaySlide({
        moverEl: overlayMoverRef.current,
        brightEl: brightRef.current,
        direction: 'down',
        onDone: () => { setAt(1); finishLock() }
      })
      return
    }

    const toEl = getRefFor(target)
    if (target === 1) prepS1ForOverlay2()

    const chosen = DOT_TRANSITIONS[target] || 'slideIn'

    toEl?.classList.remove('hidden')
    runTransition({
      name: chosen,
      fromEl,
      toEl,
      onDone: () => {
        if (target !== 2) s2Ref.current?.classList.add('hidden')
        if (target !== 1) s1GroupRef.current?.classList.add('hidden')
        setAt(target)
        finishLock()
      }
    })
  }, [at, start])

  // Initial visibility
  useEffect(() => {
    s1GroupRef.current?.classList.remove('hidden')
    baseS1Ref.current?.classList.remove('hidden')

    s2Ref.current?.classList.add('hidden')

    if (brightRef.current) {
      brightRef.current.classList.add('opacity-0')
      brightRef.current.classList.remove('opacity-100')
    }

    if (overlayMoverRef.current) {
      overlayMoverRef.current.classList.add('translate-y-0')
      overlayMoverRef.current.classList.remove('-translate-y-full')
    }

    containerRef.current?.focus()
  }, [])

  // NEW: listen for sequential opening lifecycle and hide arrows only during it.
  // Provider will NOT emit "sequence-start" if all visible dots are already open.
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

  const goDown = useCallback(() => {
    const finishLock = start()
    if (!finishLock) return

    if (at === 0) {
      overlaySlide({
        moverEl: overlayMoverRef.current,
        brightEl: brightRef.current,
        direction: 'down',
        onDone: () => { setAt(1); finishLock() }
      })
      return
    }

    if (at === 1) {
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

  // Navigation input handlers
  useEffect(() => {
    function onKeyNav(e) {
      // NEW: disable keys during sequential opening
      if (isSequentialOpening) return

      if (isAnimating) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goDown() }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goUp() }
      if (e.key === 'ArrowRight' && at === 2) { e.preventDefault(); navigate('/team') }
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

  const arrowHideDuringSeq = isSequentialOpening ? "opacity-0 pointer-events-none" : "opacity-100"

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
              <TechOverlayTwo containerRef={overlayMoverRef}/>
            </div>
          </div>
        </div>
      </div>

      {/* Screen 2 */}
      <div ref={s2Ref} className="fixed inset-0 hidden">
        <TechTwo />
      </div>

      {/* --- PROGRESS DOTS --- */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col gap-6 z-[60]">
        {DOT_SECTIONS.map((s) => {
          const activeDot = at === 0 ? null : at
          return (
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
          )
        })}
      </div>

      {/* UP ARROW */}
      <div
        className={`absolute bottom-16 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 0 ? "opacity-0 pointer-events-none" : arrowHideDuringSeq
        }`}
      >
        <button
          onClick={() => goUp()}
          aria-label="Up"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronUp className="text-white" size={32} />
        </button>
      </div>

      {/* DOWN ARROW */}
      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 2 ? "opacity-0 pointer-events-none" : arrowHideDuringSeq
        }`}
      >
        <button
          onClick={() => goDown()}
          aria-label="Down"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronDown className="text-white" size={32} />
        </button>
      </div>

      {/* --- NEXT ARROW (visible only on 2nd screen) --- */}
      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 2 ? arrowHideDuringSeq : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
          Learn more about our team
        </span>

        <button
          onClick={() => navigate("/team")}
          aria-label="Continue"
          className="p-2 hover:opacity-80 transition-opacity"
        >
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
