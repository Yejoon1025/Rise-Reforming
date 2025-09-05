import { useRef } from "react"
import bg from "../assets/unedited/Enhanced.png"
import { SlideReveal } from "../components/SlideReveal"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { HomeTwo } from "./HomeTwo"
import Navbar from "../components/Navbar"

function FirstForeground() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight">
        Rise repurposes agricultural waste into
        <br className="hidden md:block" />
        high demand chemicals
      </h1>
    </div>
  )
}


function SecondForeground({ containerRef }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <h2 className="font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
        Today’s Waste
      </h2>
      <GlowDotProvider
        baseRef={containerRef}
        openStrategy="all"          // or "next"
        threshold={0.3}
        cooldownMs={450}
        // Pass pages directly (components or elements)
        NextPage={HomeTwo}
        // Pick transitions
        transitionDown="slide-in"
        transitionDurationMs={550}
      >
        <PinnedGlowDot
          containerRef={containerRef}
          imageSrc={bg}
          normX={0.2}
          normY={0.2}
          size={12}
          color="#3ca6a6"
          text="The current production of chemicals (eg. aerosols) is heavily dependent on fossil fuels and accounts for 5~6% of global greenhouse emissions annually"
          boxWidth={320}
          dotId="gd-1"
          defaultSide="right"
        />
        <PinnedGlowDot
          containerRef={containerRef}
          imageSrc={bg}
          normX={0.8}
          normY={0.6}
          size={12}
          color="#3ca6a6"
          text="Biogas is a gas produced by breaking down agricultural waste and other organic materials from large-scale industrial farms"
          boxWidth={320}
          dotId="gd-2"
          defaultSide="left"
          defaultGap={300}
        />
        <PinnedGlowDot
          containerRef={containerRef}
          imageSrc={bg}
          normX={0.8}
          normY={0.5}
          size={12}
          color="#3ca6a6"
          text="But 42% of US biogas is not effectively utilized: wasted or forced into low-margin usages like electrity generation"
          boxWidth={320}
          dotId="gd-0"
          defaultSide="left"
          defaultGap={300}
        />
      </GlowDotProvider>
    </div>
  )
}


export function HomeOne() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Navbar />
      <SlideReveal
        first={<FirstForeground />}
        second={<SecondForeground containerRef={sectionRef} />}
        arrowColor="#f8da9c"
      />
    </section>
  )
}