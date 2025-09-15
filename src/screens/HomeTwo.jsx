import { useRef } from "react"
import bg from "../assets/HomeTwo.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import { Home4, Home5, Home4Title} from "../data/PageContent"

export function HomeTwo() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[30%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Turns Into
        </h2>
      </div>
      <GlowDotProvider
        baseRef={sectionRef}         // ← base element we animate/commit
        openStrategy="next"
        threshold={0.3}
      >
        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.49}
                        normY={0.7}
                        title = {Home4Title}
                        text= {Home4}
                        dotId="h2-1"
                        defaultOffsetX = {-500}
                        defaultOffsetY = {-200}
                        boxNumber = "1"
                      />
        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.62}
                        normY={0.65}
                        text= {Home5}
                        dotId="h2-2"
                        defaultOffsetX = {100}
                        defaultOffsetY = {-200}
                        boxNumber = "2"
                      />
      </GlowDotProvider>
    </section>
  )
}