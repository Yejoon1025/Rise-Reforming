import { useRef, useEffect, useState } from "react"
import bg from "../assets/NewsDark.png"
import overlayBg from "../assets/NewLight.png"
import { TimeLine } from "../components/Timeline"
import Navbar from "../components/Navbar"
import { newsTimelineItems } from "../data/NewsItems"

export default function News() {
  const timelineRef = useRef(null)
  const [overlayOpacity, setOverlayOpacity] = useState(1) // 1 = fully visible

  const TITLE_TOP_VH = 15
  const FADE_DISTANCE_PX = 600 // adjust fade range

  function clamp(n, min, max) {
    if (Number.isNaN(n)) return min
    if (n < min) return min
    if (n > max) return max
    return n
  }

  function scrollToTimeline() {
    const el = timelineRef.current
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const progress = clamp(window.scrollY / FADE_DISTANCE_PX, 0, 1)
        const next = 1 - progress
        if (next !== overlayOpacity) setOverlayOpacity(next)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [overlayOpacity])

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
      {/* Overlay image with numeric opacity */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${overlayBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          opacity: overlayOpacity,
        }}
      />

      <header className="relative z-30">
        <Navbar />
      </header>

      <section className="relative z-20 flex min-h-[40vh] items-center justify-center px-6">
        <h1
          className="relative font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] text-center"
          style={{ top: `${TITLE_TOP_VH}vh` }}
        >
          The Rise Reforming Timeline
        </h1>
      </section>

      <section ref={timelineRef} className="relative z-10">
        <TimeLine
          items={newsTimelineItems}
          backgroundUrl={bg}
          overlayUrl={overlayBg}
          overlayOpacity={overlayOpacity} 
          color="#3ca6a6"
          dotSize={12}
          cardWidth={420}
        />
      </section>
    </div>
  )
}
