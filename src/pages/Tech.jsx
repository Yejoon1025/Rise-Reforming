import { useRef } from "react"
import bg from "../assets/TechBG.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import Navbar from "../components/Navbar"



export function Tech() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Navbar />
          <div className="h-full w-full flex items-center justify-center">
              <h2 className="font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
                  Rise's proprietary process is
              </h2>
          </div>

      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="all"
        threshold={0.3}
        cooldownMs={450}
      >
        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.2}
          normY={0.7}
          size={12}
          color="#3ca6a6"
          text="Plastic Type Agnostic: Able to take in all 7 main types of plastics as feedstock"
          boxWidth={320}
          dotId="t-1"
          defaultSide="left"
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.32}
          normY={0.3}
          size={12}
          color="#3ca6a6"
          text="Modular: Fits within a 40’ shipping container, allowing for rapid deployment, lower CAPEX, quicker payback, and easy scalability"
          boxWidth={320}
          dotId="t-2"
          defaultSide="top"
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.61}
          normY={0.36}
          size={12}
          color="#3ca6a6"
          text="Climate Neutral: Has no emissions from the production process whatsoever"
          boxWidth={320}
          dotId="t-3"
          defaultSide="top"
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.73}
          normY={0.8}
          size={12}
          color="#3ca6a6"
          text="Price Competitive: DME produced by rise is both high quality and price competitive with traditional DME manufacturers, never seen before with eco-friendly producers"
          boxWidth={320}
          dotId="t-4"
          defaultSide="top"
        />


      </GlowDotProvider>
    </section>
  )
}