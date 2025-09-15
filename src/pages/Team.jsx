// src/pages/TeamPage.jsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { CardFlip } from "../components/CardFlip"
import altBg from "../assets/TableBright.png"
import Navbar from "../components/Navbar"
import { ADVISORS, EXEC } from "../data/Profiles"
import { ChevronDown, ChevronRight } from "lucide-react"

// OPTIONAL: replace with your alternate background image
import bg from "../assets/TableDark.png"
const ALT_BG = altBg // ← default fallback so this compiles; replace with altBg above when ready

export default function Team() {
  const navigate = useNavigate()

  // page: 0 = hero, 1 = exec team, 2 = advisors
  const [page, setPage] = useState(0)
  // `at` mirrors the current page (like in Home.jsx) and is used for dots/arrow logic
  const [at, setAt] = useState(0)
  const MAX_PAGE = 2

  // --- Lock navigation during transitions to prevent skipping multiple pages
  const TRANSITION_MS = 700
  const [locked, setLocked] = useState(false)
  const unlockRef = useRef(null)
  const SCROLL_THRESHOLD = 30 // ignore micro scroll jitter

  useEffect(() => {
    return () => {
      if (unlockRef.current) clearTimeout(unlockRef.current)
    }
  }, [])

  // helper to keep `page` and `at` in sync and clamped
  const goToPage = (n) => {
    const clamped = Math.max(0, Math.min(n, MAX_PAGE))
    if (locked || clamped === page) return

    setPage(clamped)
    setAt(clamped)

    setLocked(true)
    if (unlockRef.current) clearTimeout(unlockRef.current)
    unlockRef.current = setTimeout(() => setLocked(false), TRANSITION_MS + 100)
  }

  // Adjustable subheading left offset (in rem units by default, tailwind spacing scale)
  const subheadOffset = "left-24"

  // Handle scroll wheel or arrow keys
  useEffect(() => {
    const handleInput = (e) => {
      if (locked) {
        if (e.type === "wheel") e.preventDefault()
        return
      }

      if (e.type === "wheel") {
        if (Math.abs(e.deltaY) < SCROLL_THRESHOLD) return
        if (page < MAX_PAGE && e.deltaY > 0) {
          e.preventDefault()
          goToPage(page + 1)
        } else if (page > 0 && e.deltaY < 0) {
          e.preventDefault()
          goToPage(page - 1)
        }
        return
      }

      if (e.type === "keydown") {
        if (page < MAX_PAGE && (e.key === "ArrowDown" || e.key === "PageDown")) {
          e.preventDefault()
          goToPage(page + 1)
        } else if (page > 0 && (e.key === "ArrowUp" || e.key === "PageUp")) {
          e.preventDefault()
          goToPage(page - 1)
        }
      }
    }

    window.addEventListener("wheel", handleInput, { passive: false })
    window.addEventListener("keydown", handleInput)
    return () => {
      window.removeEventListener("wheel", handleInput)
      window.removeEventListener("keydown", handleInput)
    }
  }, [page, locked])

  // Dot navigation config (hero is not a dot)
  const sections = [
    { id: 1, label: "Executive Team" },
    { id: 2, label: "Advisors" },
  ]
  const lastDotId = sections[sections.length - 1].id

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
      {/* Secondary fade-in background when not at top */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-center bg-cover bg-no-repeat transition-opacity duration-700 ease-in-out z-0 ${
          page === 0 ? "opacity-0" : "opacity-100"
        }`}
        style={{
          backgroundImage: `url(${ALT_BG})`,
          backgroundAttachment: "fixed",
        }}
      />

      <Navbar />

      {/* Page wrapper with smooth vertical slide */}
      <div
        className="h-full w-full transition-transform duration-700 ease-in-out relative z-[10]"
        style={{ transform: `translateY(-${page * 100}vh)` }}
      >
        {/* --- PAGE 1: HERO --- */}
        <section className="h-screen flex flex-col items-center justify-center relative">
          <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight">
            Our Team
          </h1>

          {/* Down arrow */}
          <button onClick={() => goToPage(1)} className="absolute bottom-12 animate-bounce">
            <ChevronDown size={40} style={{ color: "#f8da9c" }} />
          </button>
        </section>

        {/* --- PAGE 2: EXECUTIVE TEAM --- */}
        <section className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Executive Team
        </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={EXEC}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.3}
              anchorYRatio={0.2}
            />
          </div>
        </section>

        {/* --- PAGE 3: ADVISORS --- */}
        <section className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Advisors
        </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={ADVISORS}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-0}
              anchorXRatio={0.3}
              anchorYRatio={0.2}
              reversed
            />
          </div>
        </section>
      </div>

      {/* --- PROGRESS DOTS (2 dots) --- */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 flex flex-col gap-6 z-[20]">
        {sections.map((s) => (
          <div key={s.id} className="relative group flex items-center">
            {/* Hover text */}
            <span className="absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
              {s.label}
            </span>

            {/* Dot */}
            <button
              onClick={() => goToPage(s.id)}
              className={`w-4 h-4 rounded-full border-2 border-white transition-colors ${
                at === s.id ? "bg-white" : "bg-transparent"
              }`}
              aria-label={s.label}
            />
          </div>
        ))}
      </div>

      {/* --- NEXT ARROW (now fades in on the 2nd dot) --- */}
      <div
        className={`absolute bottom-8 right-8 z-[60] group transition-opacity duration-700 flex items-center ${
          at === lastDotId ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
          Learn more about our journey
        </span>

        <button
          onClick={() => navigate("/news")}
          aria-label="Continue"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronRight className="text-white animate-bounce-x" size={32} />
        </button>
      </div>
    </div>
  )
}
