import { useRef } from "react"
import bg from "../assets/unedited/Globe.png"
import { HomeThree } from "./HomeThree"
import { HomeOne } from "./HomeOne"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import Navbar from "../components/Navbar"



export function HomeFour() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Navbar />
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Future Impact
        </h2>
      </div>
      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="all"          // or "next"
        threshold={0.3}
        cooldownMs={450}
        // Pass pages directly (components or elements)
        PrevPage={HomeThree}
        // Pick transitions
        transitionUp="zoom-in"
        transitionDurationMs={550}
      >

         <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.32}
          normY={0.42}
          size={12}
          color="#3ca6a6"
          text="1kg of Rise’s DME will avoid close to 4.5kg of CO2"
          boxWidth={320}
          dotId="gd-8"
          defaultSide="right"
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.6}
          normY={0.7}
          size={12}
          color="#3ca6a6"
          text="At full scale: 26% of US annual post-industrial plastic waste | 14,000,000 tonnes of CO2 per year"
          boxWidth={320}
          dotId="gd-9"
          defaultSide="left"
          defaultGap={300}
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.6}
          normY={0.7}
          size={12}
          color="#3ca6a6"
          text="Equivalently: 1500 soccer stadiums of plastic | 1.6 million cars off the road"
          boxWidth={320}
          dotId="gd-10"
          defaultSide="right"
        />

      </GlowDotProvider>
    </section>
  )
}