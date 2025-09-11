import { useRef } from "react"
import bg from "../assets/backgrounds/News.png"
import { TimeLine } from "../components/Timeline"
import Navbar from "../components/Navbar"
import { newsTimelineItems } from "../data/NewsItems"

export function NewsPage() {
  const timelineRef = useRef(null)

  // Adjust with viewport units to nudge the title lower
  const TITLE_TOP_VH = 15

  function scrollToTimeline() {
    const el = timelineRef.current
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Navbar at top */}
      <header className="relative z-30">
        <Navbar />
      </header>

      {/* Simple centered title with adjustable relative offset in vh */}
      <section className="relative z-20 flex min-h-[40vh] items-center justify-center px-6">
        <h1
          className="relative font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] text-center"
          style={{ top: `${TITLE_TOP_VH}vh` }}
        >
          Latest Events
        </h1>
      </section>

      {/* Timeline starts right after the title */}
      <section ref={timelineRef} className="relative z-10">
        <TimeLine
          items={newsTimelineItems}
          backgroundUrl={bg}
          color="#3ca6a6"
          dotSize={12}
          cardWidth={420}
        />
      </section>
    </div>
  )
}

export default NewsPage