// src/pages/timeline-horizontal-demo.jsx
import { useState, useEffect } from "react"
import { CardFlip } from "../components/CardFlip"
import bg from "../assets/unedited/Table.png"
import Navbar from "../components/Navbar"
import { people, morePeople } from "../data/Profiles"
import { ChevronDown } from "lucide-react"

export function TeamPage() {
  const [page, setPage] = useState(0) // 0 = hero, 1 = exec team, 2 = advisors, 3 = interns

  // Adjustable subheading left offset (in rem units by default, tailwind spacing scale)
  const subheadOffset = "left-24" // change to left-20, left-32, etc.

  // Handle scroll wheel or arrow keys
  useEffect(() => {
    const handleScroll = (e) => {
      if (page < 3 && (e.deltaY > 0 || e.key === "ArrowDown" || e.key === "PageDown")) {
        e.preventDefault()
        setPage((p) => Math.min(p + 1, 3))
      } else if (page > 0 && (e.deltaY < 0 || e.key === "ArrowUp" || e.key === "PageUp")) {
        e.preventDefault()
        setPage((p) => Math.max(p - 1, 0))
      }
    }
    window.addEventListener("wheel", handleScroll, { passive: false })
    window.addEventListener("keydown", handleScroll)
    return () => {
      window.removeEventListener("wheel", handleScroll)
      window.removeEventListener("keydown", handleScroll)
    }
  }, [page])

  // Dot navigation config
  const sections = [
    { id: 1, label: "Executive Team" },
    { id: 2, label: "Advisors" },
    { id: 3, label: "Interns" },
  ]

  return (
    <div
      className="h-screen w-full overflow-hidden relative font-[Bahnschrift]"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <Navbar />

      {/* Page wrapper with smooth vertical slide */}
      <div
        className="h-full w-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateY(-${page * 100}vh)` }}
      >
        {/* --- PAGE 1: HERO --- */}
        <section className="h-screen flex flex-col items-center justify-center relative">
          <h1
            className="text-5xl font-bold"
            style={{ color: "#e0e0e0" }}
          >
            Our Team
          </h1>

          {/* Down arrow */}
          <button
            onClick={() => setPage(1)}
            className="absolute bottom-12 animate-bounce"
          >
            <ChevronDown size={40} style={{ color: "#f8da9c" }} />
          </button>
        </section>

        {/* --- PAGE 2: EXECUTIVE TEAM --- */}
        <section className="h-screen w-full relative flex flex-col justify-end">
          <h2
            className={`absolute top-24 ${subheadOffset} text-4xl font-semibold`}
            style={{ color: "#f8da9c" }}
          >
            Executive Team
          </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={people}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={0}
              anchorXRatio={0.3}
              anchorYRatio={0.2}
            />
          </div>
        </section>

        {/* --- PAGE 3: ADVISORS --- */}
        <section className="h-screen w-full relative flex flex-col justify-end">
          <h2
            className={`absolute top-24 ${subheadOffset} text-4xl font-semibold`}
            style={{ color: "#f8da9c" }}
          >
            Advisors
          </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={morePeople}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={60}
              anchorXRatio={0.3}
              anchorYRatio={0.2}
            />
          </div>
        </section>

        {/* --- PAGE 4: INTERNS --- */}
        <section className="h-screen w-full relative flex flex-col justify-end">
          <h2
            className={`absolute top-24 ${subheadOffset} text-4xl font-semibold`}
            style={{ color: "#f8da9c" }}
          >
            Interns
          </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={people}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={60}
              anchorXRatio={0.3}
              anchorYRatio={0.2}
            />
          </div>
        </section>
      </div>

      {/* --- PROGRESS DOTS --- */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col gap-6">
        {sections.map((s) => (
          <div key={s.id} className="relative group flex items-center">
            {/* Hover text */}
            <span
              className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap"
            >
              {s.label}
            </span>

            {/* Dot */}
            <button
              onClick={() => setPage(s.id)}
              className={`w-4 h-4 rounded-full border-2 border-white transition-colors ${
                page === s.id ? "bg-white" : "bg-transparent"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
