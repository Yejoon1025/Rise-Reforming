import { useRef } from "react"
import bg from "../assets/TechTwo.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import { Tech6, Tech7, Tech8, Tech6Title, Tech7Title, Tech8Title} from "../data/PageContent"

export function TechTwo() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[80%] right-[10%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Our Process Is
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
          normX={0.41}
          normY={0.1}
          title = {Tech6Title}
          text= {Tech6}
          dotId="t2-1"
          defaultOffsetX = {-100}
          defaultOffsetY = {200}
          boxNumber = "1"
        />
        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.7}
          normY={0.35}
          title = {Tech7Title}
          text= {Tech7}
          dotId="t2-2"
          defaultOffsetX = {-100}
          defaultOffsetY = {-100}
          boxNumber = "2"
        />
        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.2}
          normY={0.7}
          title = {Tech8Title}
          text= {Tech8}
          dotId="t2-3"
          defaultOffsetX = {-100}
          defaultOffsetY = {-100}
          boxNumber = "3"
        />
      </GlowDotProvider>
    </section>
  )
}