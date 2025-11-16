// src/pages/TeamPage.jsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { CardFlip } from "../components/CardFlip"
import altBg from "../assets/TableBright.png"
import Navbar from "../components/Navbar"
import { ADVISORS, EXEC } from "../data/Profiles"
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react"

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

      if (e.type === "keydown") {
        if (page < MAX_PAGE && (e.key === "ArrowDown" || e.key === "PageDown")) {
          e.preventDefault()
          goToPage(page + 1)
        } else if (page > 0 && (e.key === "ArrowUp" || e.key === "PageUp")) {
          e.preventDefault()
          goToPage(page - 1)
        } else if (page == MAX_PAGE && (e.key === "ArrowRight")) {
          e.preventDefault()
          navigate("/news")
        }
      }
    }

    window.addEventListener("keydown", handleInput)
    return () => {
      window.removeEventListener("keydown", handleInput)
    }
  }, [page, locked])

  // Dot navigation config (hero is not a dot)
  const sections = [
    { id: 1, label: "Core Team" },
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
        </section>

        {/* --- PAGE 2: EXECUTIVE TEAM --- */}
        <section className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-2xl md:text-4xl text-[#f8da9c] px-6 text-center">
          Core Team:
        </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={EXEC}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.35}
              anchorYRatio={0.10}
            />
          </div>
          <div
          className="absolute bottom-20 z-[70] text-white/70 text-sm md:text-base animate-pulse select-none pointer-events-auto"
        >
          Click on anyone to learn more!
        </div>
        </section>

        {/* --- PAGE 3: ADVISORS --- */}
        <section className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-2xl md:text-4xl text-[#f8da9c] px-6 text-center">
          Advisors:
        </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={ADVISORS}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.35}
              anchorYRatio={0.10}
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
<div
        className={`absolute bottom-16 right-5 z-[60] group transition-opacity duration-700 flex items-center ${at === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >

        {/* Chevron icon button */}
        <button
          onClick={() => goToPage(page - 1)}
          aria-label="Up"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronUp className="text-white" size={32} />

        </button>
      </div>


      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${at === 2 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
      >

        {/* Chevron icon button */}
        <button
          onClick={() => goToPage(page + 1)}
          aria-label="Down"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronDown className="text-white" size={32} />

        </button>
      </div>

      {/* --- NEXT ARROW (visible only on 2nd screen) --- */}
<div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 2 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Hover label to the left, styled like dot labels */}
        <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
          Learn more about our journey
        </span>

        {/* Chevron icon button */}
        <button
          onClick={() => navigate("/news")}
          aria-label="Continue"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronRight className="text-white" size={32} />

        </button>
      </div>
    </div>
  )
}
