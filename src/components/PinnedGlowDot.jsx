import { useEffect, useMemo, useRef, useState } from "react"
import { GlowDot } from "./GlowDot.jsx"
// Assuming you already have this hook/util in your project
import { useCoverAnchor } from "./useCoverAnchor.js"

/**
 * PinnedGlowDot — keeps the GlowDot mounted so open state persists
 *
 * Instead of returning null while coordinates are not ready, we keep the
 * GlowDot mounted off-screen and non-interactive, then reveal it when ready.
 */
export function PinnedGlowDot({
  containerRef,
  imageSrc,
  normX,
  normY,
  dotId,
  className,
  ...dotProps
}) {
  const anchor = useCoverAnchor({ containerRef, imageSrc, normX, normY })

  // Persist last known coords to avoid jumping back to closed state on remount
  const [lastCoords, setLastCoords] = useState(null)
  useEffect(() => {
    if (anchor && typeof anchor.top === "number" && typeof anchor.left === "number")
      setLastCoords({ top: anchor.top, left: anchor.left })
  }, [anchor?.top, anchor?.left])

  const coords = anchor ?? lastCoords
  const isReady = !!coords

  // When not ready, park off-screen but keep mounted. Prevent click/hover.
  const safeTop = isReady ? coords.top : -99999
  const safeLeft = isReady ? coords.left : -99999
  const mergedClass = [className, isReady ? "" : "opacity-0 pointer-events-none"].filter(Boolean).join(" ")

  return (
    <GlowDot
      {...dotProps}
      dotId={dotId}
      top={safeTop}
      left={safeLeft}
      className={mergedClass}
      aria-hidden={isReady ? undefined : true}
    />
  )
}
