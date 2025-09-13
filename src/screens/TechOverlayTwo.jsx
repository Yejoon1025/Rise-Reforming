import { useRef } from "react"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import bg from "../assets/TechOne.png"
import { Tech1,Tech2,Tech3,Tech4} from "../data/PageContent"

export default function TechOverlayTwo({ containerRef }) {
  const sectionRef = containerRef

  return (
      

    <div className="h-full w-full flex items-center justify-center">
      <h2 className="font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
        In simple terms, we:
      </h2>
      <GlowDotProvider
              baseRef={sectionRef}         // ← base element we animate/commit
              openStrategy="next"
              threshold={0.3}
            >
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.35}
                normY={0.3}
                text= {Tech4}
                dotId="t1-4"
                defaultOffsetX = {-300}
                defaultOffsetY = {300}
                boxNumber = "2"
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.7}
                normY={0.35}
                text= {Tech1}
                dotId="t1-1"
                defaultOffsetX = {-100}
                defaultOffsetY = {-100}
                boxNumber = "1"
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.35}
                normY={0.3}
                text= {Tech2}
                dotId="t1-2"
                defaultOffsetX = {-100}
                defaultOffsetY = {-100}
                boxNumber = "2"
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.8}
                normY={0.68}
                text= {Tech3}
                dotId="t1-3"
                defaultOffsetX = {-100}
                defaultOffsetY = {-100}
                boxNumber = "3"
              />
              
            </GlowDotProvider>
    </div>
  )
}