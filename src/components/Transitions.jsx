// src/transitions/Transitions.jsx

function cleanupNode(node) {
  if (!node) return
  node.style.zIndex = ""
  node.style.pointerEvents = ""
  node.style.transitionProperty = ""
  node.style.transitionDuration = ""
  node.style.transitionTimingFunction = ""
  node.style.transformOrigin = ""
  node.style.transform = ""
  node.style.opacity = ""
  node.style.willChange = ""
  node.style.filter = ""
  node.classList.remove(
    "translate-x-0",
    "translate-x-full",
    "-translate-x-full",
    "opacity-0",
    "opacity-100"
  )
}

function afterTransition(node, durationMs, cb) {
  if (!node) {
    cb?.()
    return
  }
  let called = false
  const done = e => {
    if (called) return
    if (e && e.target !== node) return
    called = true
    node.removeEventListener("transitionend", done)
    cb?.()
  }
  node.addEventListener("transitionend", done)
  // Fallback in case transitionend doesn't fire
  setTimeout(() => done(), Math.max(50, durationMs + 50))
}

/**
 * Slide IN:
 * - fromRef stays static (behind)
 * - toRef slides in from the right on top
 * After: fromRef is hidden and cleaned, toRef interactive.
 */
export function slideIn({
  fromRef,
  toRef,
  onDone,
  durationMs = 900,
  easing = "cubic-bezier(0.22,1,0.36,1)",
  distance = "-100%",
  fade = false
}) {
  if (!fromRef || !toRef) {
    onDone?.()
    return
  }

  // FROM stays behind, static
  fromRef.classList.remove("hidden")
  fromRef.style.zIndex = "0"
  fromRef.style.pointerEvents = "none"
  fromRef.style.transform = "translateX(0)"
  fromRef.style.opacity = "1"

  // TO comes in from the left on top
  toRef.classList.remove("hidden")
  toRef.style.zIndex = "20"
  toRef.style.pointerEvents = "none"
  toRef.style.willChange = "transform, opacity"
  toRef.style.transitionProperty = "transform, opacity"
  toRef.style.transitionDuration = `${durationMs}ms`
  toRef.style.transitionTimingFunction = easing
  toRef.style.transform = `translateX(${distance})` // e.g., -100%
  toRef.style.opacity = fade ? "0" : "1"

  void toRef.getBoundingClientRect()

  requestAnimationFrame(() => {
    toRef.style.transform = "translateX(0)"
    if (fade) toRef.style.opacity = "1"
  })

  afterTransition(toRef, durationMs, () => {
    fromRef.classList.add("hidden")
    cleanupNode(fromRef)
    cleanupNode(toRef)
    toRef.style.pointerEvents = "auto"
    onDone?.()
  })
}

/**
 * Slide OUT:
 * - fromRef slides out to the right
 * - toRef sits behind as if it was already there
 * After: fromRef hidden & cleaned, toRef interactive.
 */
export function slideOut({
  fromRef,
  toRef,
  onDone,
  durationMs = 900,
  easing = "cubic-bezier(0.22,1,0.36,1)",
  fade = true,
  distance = "100%"
}) {
  if (!fromRef || !toRef) {
    onDone?.()
    return
  }

  // Show destination behind (static)
  toRef.classList.remove("hidden")
  toRef.style.zIndex = "0"
  toRef.style.pointerEvents = "none"
  toRef.style.transform = "translateX(0)"
  toRef.style.opacity = "1"

  // Animate current page out
  fromRef.classList.remove("hidden")
  fromRef.style.zIndex = "20"
  fromRef.style.pointerEvents = "none"
  fromRef.style.willChange = "transform, opacity"
  fromRef.style.transitionProperty = "transform, opacity"
  fromRef.style.transitionDuration = `${durationMs}ms`
  fromRef.style.transitionTimingFunction = easing
  fromRef.style.transform = "translateX(0)"
  fromRef.style.opacity = "1"

  void fromRef.getBoundingClientRect()

  requestAnimationFrame(() => {
    fromRef.style.transform = `translateX(${distance})`
    if (fade) fromRef.style.opacity = "0"
  })

  afterTransition(fromRef, durationMs, () => {
    fromRef.classList.add("hidden")
    cleanupNode(fromRef)
    cleanupNode(toRef)
    toRef.style.pointerEvents = "auto"
    onDone?.()
  })
}

/**
 * Zoom OUT (pull back from a point):
 * - Animates FROM page (shrinks, slight blur, fades)
 * - TO page is behind
 * After: fromRef hidden & cleaned, toRef interactive.
 */
export function zoomOut({
  fromRef,
  toRef,
  onDone,
  focal = { x: 50, y: 50 },
  scaleTo = 0.35,
  durationMs = 900,
  easing = "cubic-bezier(0.22,1,0.36,1)",
  blurPx = 4
}) {
  if (!fromRef || !toRef) {
    onDone?.()
    return
  }

  toRef.classList.remove("hidden")
  toRef.style.zIndex = "0"
  toRef.style.pointerEvents = "none"

  fromRef.classList.remove("hidden")
  fromRef.style.zIndex = "20"
  fromRef.style.pointerEvents = "none"
  fromRef.style.willChange = "transform, opacity, filter"
  fromRef.style.transitionProperty = "transform, opacity, filter"
  fromRef.style.transitionDuration = `${durationMs}ms`
  fromRef.style.transitionTimingFunction = easing
  fromRef.style.transformOrigin = `${focal.x}% ${focal.y}%`
  fromRef.style.transform = "scale(1)"
  fromRef.style.opacity = "1"
  fromRef.style.filter = "blur(0px)"

  void fromRef.getBoundingClientRect()

  requestAnimationFrame(() => {
    fromRef.style.transform = `scale(${scaleTo})`
    fromRef.style.opacity = "0"
    fromRef.style.filter = `blur(${blurPx}px)`
  })

  afterTransition(fromRef, durationMs, () => {
    fromRef.classList.add("hidden")
    cleanupNode(fromRef)
    cleanupNode(toRef)
    toRef.style.pointerEvents = "auto"
    onDone?.()
  })
}

/**
 * Zoom IN (dive into a point):
 * - Animates TO page (grows from small, slight blur, fades in)
 * - FROM page stays behind static
 * After: fromRef hidden & cleaned, toRef interactive.
 */
export function zoomIn({
  fromRef,
  toRef,
  onDone,
  focal = { x: 50, y: 50 },
  scaleFrom = 0.35,
  durationMs = 900,
  easing = "cubic-bezier(0.22,1,0.36,1)",
  blurPx = 4
}) {
  if (!fromRef || !toRef) {
    onDone?.()
    return
  }

  // Destination on top, animating
  toRef.classList.remove("hidden")
  toRef.style.zIndex = "20"
  toRef.style.pointerEvents = "none"
  toRef.style.willChange = "transform, opacity, filter"
  toRef.style.transitionProperty = "transform, opacity, filter"
  toRef.style.transitionDuration = `${durationMs}ms`
  toRef.style.transitionTimingFunction = easing
  toRef.style.transformOrigin = `${focal.x}% ${focal.y}%`
  toRef.style.transform = `scale(${scaleFrom})`
  toRef.style.opacity = "0"
  toRef.style.filter = `blur(${blurPx}px)`

  // Current page sits behind
  fromRef.classList.remove("hidden")
  fromRef.style.zIndex = "0"
  fromRef.style.pointerEvents = "none"
  fromRef.style.transform = "scale(1)"
  fromRef.style.opacity = "1"
  fromRef.style.filter = "blur(0px)"

  void toRef.getBoundingClientRect()

  requestAnimationFrame(() => {
    toRef.style.transform = "scale(1)"
    toRef.style.opacity = "1"
    toRef.style.filter = "blur(0px)"
  })

  afterTransition(toRef, durationMs, () => {
    fromRef.classList.add("hidden")
    cleanupNode(fromRef)
    cleanupNode(toRef)
    toRef.style.pointerEvents = "auto"
    onDone?.()
  })
}

export function crossFade({
  fromRef,
  toRef,
  onDone,
  durationMs = 800,
  easing = "cubic-bezier(0.22,1,0.36,1)",
  withBlur = false,
  blurPx = 2
}) {
  if (!fromRef || !toRef) {
    onDone?.()
    return
  }

  // Prepare TO (behind)
  toRef.classList.remove("hidden")
  toRef.style.zIndex = "0"
  toRef.style.pointerEvents = "none"
  toRef.style.willChange = withBlur ? "opacity, filter" : "opacity"
  toRef.style.transitionProperty = withBlur ? "opacity, filter" : "opacity"
  toRef.style.transitionDuration = `${durationMs}ms`
  toRef.style.transitionTimingFunction = easing
  toRef.style.opacity = "0"
  if (withBlur) toRef.style.filter = `blur(${blurPx}px)`

  // Prepare FROM (on top)
  fromRef.classList.remove("hidden")
  fromRef.style.zIndex = "20"
  fromRef.style.pointerEvents = "none"
  fromRef.style.willChange = withBlur ? "opacity, filter" : "opacity"
  fromRef.style.transitionProperty = withBlur ? "opacity, filter" : "opacity"
  fromRef.style.transitionDuration = `${durationMs}ms`
  fromRef.style.transitionTimingFunction = easing
  fromRef.style.opacity = "1"
  if (withBlur) fromRef.style.filter = "blur(0px)"

  // Force layout
  void fromRef.getBoundingClientRect()

  // Animate in the next frame
  requestAnimationFrame(() => {
    toRef.style.opacity = "1"
    fromRef.style.opacity = "0"
    if (withBlur) {
      toRef.style.filter = "blur(0px)"
      fromRef.style.filter = `blur(${blurPx}px)`
    }
  })

  // Finish when FROM finishes its transition
  afterTransition(fromRef, durationMs, () => {
    fromRef.classList.add("hidden")
    cleanupNode(fromRef)
    cleanupNode(toRef)
    toRef.style.pointerEvents = "auto"
    onDone?.()
  })
}