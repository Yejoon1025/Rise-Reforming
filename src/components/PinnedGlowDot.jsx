import { GlowDot } from "../components/GlowDot"
import { useCoverAnchor } from "../components/useCoverAnchor"

export function PinnedGlowDot({
  containerRef,  // ref to the section that owns the background
  imageSrc,      // same URL used for the background image
  normX,         // 0..1 across the original image width
  normY,         // 0..1 down the original image height
  ...dotProps    // any GlowDot props (size, color, text, etc.)
}) {
  const { top, left, ready } = useCoverAnchor({ containerRef, imageSrc, normX, normY })
  if (!ready) return null

  // GlowDot accepts number (pixels) for top/left
  return <GlowDot top={top} left={left} {...dotProps} />
}