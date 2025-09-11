// TransitionsPagerPage.jsx
// Vite + React + Tailwind v4 — single-file page export.

import { useCallback, useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar'
import HomeOne from '../screens/HomeOne.jsx'
import { HomeTwo } from '../screens/HomeTwo.jsx'
import { HomeThree } from '../screens/HomeThree.jsx'
import { HomeFour } from '../screens/HomeFour.jsx'
import OverlayOne from '../screens/OverlayOne.jsx'
import OverlayTwo from '../screens/OverlayTwo'
import * as T from '../components/Transitions.jsx'
const TRANSITIONS = { ...T }

// ---- CODE CONFIG (code-side "menu") ---------------------------------
const PAGE_TRANSITIONS = {
  screen1: { down: 'slideIn' },      // Screen1-group → Screen2
  screen2: { up: 'slideOut', down: 'slideOut' },
  screen3: { up: 'slideIn', down: 'zoomOut' },
  screen4: { up: 'zoomIn' }
}
// --------------------------------------------------------------------

const DURATION_MS = 800 // unified guard duration; align with runner timings

function cleanup(node) {
  if (!node) return
  node.style.zIndex = ''
  node.style.pointerEvents = ''
  node.classList.remove(
    'transition-transform','duration-700','ease-out',
    'translate-y-0','-translate-y-full',
    'opacity-0','opacity-100'
  )
}

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
// 0 = overlay1, 1 = overlay2, 2 = screen2, 3 = screen3, 4 = screen4
export default function TransitionsPagerPage() {
  // Screen 1 GROUP (moves as one)
  const s1GroupRef = useRef(null)

  // Group internals
  const baseS1Ref = useRef(null)
  const brightRef = useRef(null)

  // Overlay mover (contains both overlays, stacked vertically)
  const overlayMoverRef = useRef(null)
  const o1Ref = useRef(null)
  const o2Ref = useRef(null)

  // Other screens
  const s2Ref = useRef(null)
  const s3Ref = useRef(null)
  const s4Ref = useRef(null)

  const containerRef = useRef(null)

  const [at, setAt] = useState(0)
  const { isAnimating, start } = useAnimLock()

  // Replace with your asset or import it
  const BRIGHT_IMAGE_SRC = '/H1B.png'

  // Initial visibility
  useEffect(() => {
    s1GroupRef.current?.classList.remove('hidden')

    baseS1Ref.current?.classList.remove('hidden')

    s2Ref.current?.classList.add('hidden')
    s3Ref.current?.classList.add('hidden')
    s4Ref.current?.classList.add('hidden')

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

    if (at === 2) {
      runTransition({
        name: PAGE_TRANSITIONS.screen2.down,
        fromEl: s2Ref.current,
        toEl: s3Ref.current,
        onDone: () => { setAt(3); finishLock() }
      })
      return
    }

    if (at === 3) {
      runTransition({
        name: PAGE_TRANSITIONS.screen3.down,
        fromEl: s3Ref.current,
        toEl: s4Ref.current,
        onDone: () => { setAt(4); finishLock() }
      })
      return
    }

    finishLock()
  }, [at, start])

  const goUp = useCallback(() => {
    const finishLock = start()
    if (!finishLock) return

    if (at === 4) {
      runTransition({
        name: PAGE_TRANSITIONS.screen4.up,
        fromEl: s4Ref.current,
        toEl: s3Ref.current,
        onDone: () => { setAt(3); finishLock() }
      })
      return
    }

    if (at === 3) {
      runTransition({
        name: PAGE_TRANSITIONS.screen3.up,
        fromEl: s3Ref.current,
        toEl: s2Ref.current,
        onDone: () => { setAt(2); finishLock() }
      })
      return
    }

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
          <HomeOne />
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
            <div ref={o1Ref} className="relative h-screen w-full">
              <OverlayOne />
            </div>
            {/* Layer 2 */}
            <div ref={o2Ref} className="relative h-screen w-full">
              <OverlayTwo containerRef={overlayMoverRef}/>
            </div>
          </div>
        </div>
      </div>

      {/* Screens 2–4 */}
      <div ref={s2Ref} className="fixed inset-0 hidden">
        <HomeTwo />
      </div>
      <div ref={s3Ref} className="fixed inset-0 hidden">
        <HomeThree />
      </div>
      <div ref={s4Ref} className="fixed inset-0 hidden">
        <HomeFour />
      </div>
    </div>
  )
}
