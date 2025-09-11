import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import { GlowDot } from "../components/GlowDot"

export default function OverlayTwo({ containerRef }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <h2 className="font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
        Today’s Waste
      </h2>
      <GlowDotProvider
        baseRef={containerRef}
        openStrategy="all"          // or "next"
        threshold={0.3}
      >
          <GlowDot dotId="b" top={800} left={420} text="Test" />
      </GlowDotProvider>
    </div>
  )
}