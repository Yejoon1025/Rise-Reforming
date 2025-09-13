import { useRef } from "react"
import bg from "../assets/HomeThree.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import { Home6, Home7, Home8 } from "../data/PageContent"


export function HomeThree() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-full w-full flex items-center justify-center">
        <h2 className="absolute top-[50%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Tomorrow's Value
        </h2>
      </div>

      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="next"          // or "next"
        threshold={0.3}
      >

        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.7}
                        normY={0.34}
                        text= {Home6}
                        dotId="h3-1"
                        defaultOffsetX = {-100}
                        defaultOffsetY = {-200}
                      />

        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.2}
                        normY={0.7}
                        text= {Home7}
                        dotId="h3-2"
                        defaultOffsetX = {-100}
                        defaultOffsetY = {-100}
                      />
        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.78}
                        normY={0.66}
                        text= {Home8}
                        dotId="h3-3"
                        defaultOffsetX = {-100}
                        defaultOffsetY = {-100}
                      />

      </GlowDotProvider>
    </section>
  )
}