import { useRef } from "react"
import bg from "../assets/Globe.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import { Home9, Home10 } from "../data/PageContent"

export function HomeFour() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Future Impact
        </h2>
      </div>
      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="all"          // or "next"
        threshold={0.3}
      >

         <PinnedGlowDot
            containerRef={sectionRef}
            imageSrc={bg}
            normX={0.32}
            normY={0.42}
            text= {Home9}
            dotId="h5-1"
            defaultOffsetX = {-100}
            defaultOffsetY = {100}
            boxNumber = "1"
          />
          <PinnedGlowDot
            containerRef={sectionRef}
            imageSrc={bg}
            normX={0.6}
            normY={0.7}
            text= {Home10}
            dotId="h5-2"
            defaultOffsetX = {-200}
            defaultOffsetY = {-150}
            boxNumber = "2"
          />
      </GlowDotProvider>
    </section>
  )
}