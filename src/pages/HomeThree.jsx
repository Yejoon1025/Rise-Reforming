import { useRef } from "react"
import bg from "../assets/unedited/Tech.png"
import { HomeTwo } from "./HomeTwo"
import { HomeFour } from "./HomeFour"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import Navbar from "../components/Navbar"



export function HomeThree() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Navbar />
      <div className="h-screen w-full flex items-center justify-center md:items-end md:justify-end p-6 md:p-30">
        <h2 className="font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] text-center md:text-right">
          Tomorrow's Value
        </h2>
      </div>

      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="all"          // or "next"
        threshold={0.3}
        cooldownMs={450}
        // Pass pages directly (components or elements)
        PrevPage={HomeTwo}
        NextPage={HomeFour}
        // Pick transitions
        transitionDown="zoom-out"
        transitionUp="slide-in"
        transitionDurationMs={550}
      >

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.2}
          normY={0.7}
          size={12}
          color="#3ca6a6"
          text="Aerosol: DME is preferred as an alternative propellant in products like air fresheners and hairspray"
          boxWidth={320}
          dotId="gd-5"
          defaultSide="right"
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.32}
          normY={0.6}
          size={12}
          color="#3ca6a6"
          text="Saving on disposal costs: manufacturing companies often pay over $100/ton to landfill and over $500/ton to incinerate their post-industrial plastic waste"
          boxWidth={320}
          dotId="gd-6"
          defaultSide="top"
          defaultGap={300}
        />

        <PinnedGlowDot
          containerRef={sectionRef}
          imageSrc={bg}
          normX={0.75}
          normY={0.4}
          size={12}
          color="#3ca6a6"
          text="Alternative Fuel: DME can be blended with propane to create an alternative fuel that achieves higher combustion efficiency with lower lifecycle emissions"
          boxWidth={320}
          dotId="gd-7"
          defaultSide="left"
        />


      </GlowDotProvider>
    </section>
  )
}