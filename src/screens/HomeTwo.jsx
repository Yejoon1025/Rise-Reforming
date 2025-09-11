import { useRef } from "react"
import bg from "../assets/backgrounds/H2.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"

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
        openStrategy="all"
        threshold={0.3}
      >


        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.45}
          normY={0.6}
          size={12}
          color="#3ca6a6"
          text="Rise Reforming repurposes biogas (RNG) waste into dimethyl ether (DME), an in-demand and versatile chemical"
          boxWidth={320}
          dotId="gd-3"
          defaultSide="left"
          defaultGap={300}
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.6}
          normY={0.55}
          size={12}
          color="#3ca6a6"
          text="DME’s global market size is almost $10 bn and is expected to double over the next decade"
          boxWidth={320}
          dotId="gd-4"
          defaultSide="right"
        />


      </GlowDotProvider>
    </section>
  )
}