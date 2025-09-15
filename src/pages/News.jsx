import { useRef, useEffect, useState } from "react"
import bg from "../assets/NewsDark.png"
import overlayBg from "../assets/NewLight.png"
import { TimeLine } from "../components/Timeline"
import Navbar from "../components/Navbar"
import { newsTimelineItems } from "../data/NewsItems"

export default function News() {
  const timelineRef = useRef(null)

  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >

      <header className="relative z-30">
        <Navbar />
      </header>

      <section className="relative z-20 flex min-h-[40vh] items-center justify-center px-6">
        <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight absolute top-[35vh]">
          The Rise Reforming Timeline
        </h1>
      </section>

      <section ref={timelineRef} className="relative z-10">
        <TimeLine
          items={newsTimelineItems}
          backgroundUrl={bg}
          overlayUrl={overlayBg}
          color="#3ca6a6"
          dotSize={12}
          cardWidth={420}
        />
      </section>
    </div>
  )
}
