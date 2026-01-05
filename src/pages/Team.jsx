// src/pages/TeamPage.jsx
import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { CardFlip } from "../components/CardFlip"
import altBg from "../assets/TableBright.png"
import Navbar from "../components/Navbar"
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react"

// OPTIONAL: replace with your alternate background image
import bg from "../assets/TableDark.png"
const ALT_BG = altBg // ← default fallback so this compiles; replace with altBg above when ready

// URL for remote Profile.json
const PROFILE_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Profile.json"

export default function Team() {
  const navigate = useNavigate()

  // page: 0 = hero, 1 = exec team, 2 = advisors, 3 = CTA to News
  const [page, setPage] = useState(0)
  const [at, setAt] = useState(0)
  const MAX_PAGE = 3

  // profiles loaded from remote JSON
  const [exec, setExec] = useState([])
  const [advisors, setAdvisors] = useState([])

  // --- Lock navigation during transitions to prevent skipping multiple pages
  // Faster lock to feel snappier (similar to TimeLine.jsx)
  const TRANSITION_MS = 420
  const [locked, setLocked] = useState(false)
  const unlockRef = useRef(null)

  // --- wheel tuning (TimeLine.jsx-style: EMA filter + small trigger)
  const WHEEL_TRIGGER_PX = 48
  const EMA_MIN = 40
  const EMA_TAU_MS = 120

  const wheelAccumRef = useRef(0)
  const emaRef = useRef(0)
  const lastTsRef = useRef(0)

  // fetch profiles from GitHub once on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch(PROFILE_URL)
        if (!res.ok) {
          throw new Error(`Failed to fetch profiles: ${res.status}`)
        }
        const data = await res.json()
        // Profile.json has top-level EXEC and ADVISORS keys
        setExec(data.EXEC || [])
        setAdvisors(data.ADVISORS || [])
      } catch (err) {
        console.error("Error loading profiles from GitHub:", err)
      }
    }

    fetchProfiles()

    return () => {
      if (unlockRef.current) clearTimeout(unlockRef.current)
    }
  }, [])

  // helper to keep `page` and `at` in sync and clamped
  const goToPage = useCallback(
    (n) => {
      const clamped = Math.max(0, Math.min(n, MAX_PAGE))
      if (locked || clamped === page) return

      setPage(clamped)
      setAt(clamped)

      setLocked(true)
      if (unlockRef.current) clearTimeout(unlockRef.current)
      unlockRef.current = setTimeout(() => setLocked(false), TRANSITION_MS + 60)
    },
    [locked, page, MAX_PAGE]
  )

  // Adjustable subheading left offset (in rem units by default, tailwind spacing scale)
  const subheadOffset = "left-24"

  // Keyboard + Wheel paging (PageUp/PageDown behavior)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent held-key repeating from triggering multiple actions
      if (e.repeat) return

      if (page < MAX_PAGE && (e.key === "ArrowDown" || e.key === "PageDown")) {
        e.preventDefault()
        goToPage(page + 1)
        return
      }

      if (page > 0 && (e.key === "ArrowUp" || e.key === "PageUp")) {
        e.preventDefault()
        goToPage(page - 1)
        return
      }

      if (page === MAX_PAGE && e.key === "ArrowRight") {
        e.preventDefault()
        navigate("/news")
      }
    }

    const handleWheel = (e) => {
      // We control paging; block native scroll
      e.preventDefault()

      // Lock prevents long scroll from skipping multiple pages
      if (locked) return

      // --- EMA update (filters tiny deltas / noise) ---
      const absDy = Math.abs(e.deltaY)
      const ts = e.timeStamp || performance.now()
      const dt = lastTsRef.current ? ts - lastTsRef.current : 16
      lastTsRef.current = ts

      const alpha = 1 - Math.exp(-dt / EMA_TAU_MS)
      emaRef.current = (1 - alpha) * emaRef.current + alpha * absDy

      if (emaRef.current <= EMA_MIN) {
        wheelAccumRef.current = 0
        return
      }
      // -----------------------------------------------

      wheelAccumRef.current += e.deltaY
      if (Math.abs(wheelAccumRef.current) < WHEEL_TRIGGER_PX) return

      const down = wheelAccumRef.current > 0
      wheelAccumRef.current = 0

      if (down) {
        if (page < MAX_PAGE) goToPage(page + 1)
      } else {
        if (page > 0) goToPage(page - 1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("wheel", handleWheel)
    }
  }, [page, locked, goToPage, navigate, MAX_PAGE])

  // Dot navigation config (hero is not a dot)
  const sections = [
    { id: 1, label: "Core Team" },
    { id: 2, label: "Advisors" },
    { id: 3, label: "Next" },
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
              items={exec}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.35}
              anchorYRatio={0.1}
            />
          </div>
          <div className="absolute bottom-20 z-[70] text-white/70 text-sm md:text-base animate-pulse select-none pointer-events-auto">
            Click on cards or use arrows to navigate
          </div>
        </section>

        {/* --- PAGE 3: ADVISORS --- */}
        <section className="h-screen w-full flex justify-center relative">
          <h2 className="absolute top-[20%] font-bahnschrift text-2xl md:text-4xl text-[#f8da9c] px-6 text-center">
            Advisors:
          </h2>
          <div className="w-full absolute bottom-0 pb-8">
            <CardFlip
              items={advisors}
              color="#3ca6a6"
              progressColor="#3ca6a6"
              dotSize={12}
              cardWidth={250}
              overlapPx={-20}
              anchorXRatio={0.35}
              anchorYRatio={0.1}
            />
          </div>
        </section>

        {/* --- PAGE 4: CTA TO NEWS --- */}
        <section className="h-screen w-full flex items-center justify-center relative">
          <div className="w-full flex items-center justify-center px-6">
            <h1 className="font-bahnschrift text-3xl md:text-5xl text-[#e0e0e0] text-center leading-tight max-w-[70vw] mx-auto">
              Head to the news tab to learn more about our journey!
            </h1>
          </div>

          <div className="absolute bottom-20 z-[70] text-white/70 text-sm md:text-base animate-pulse select-none pointer-events-none">
            Press →
          </div>
        </section>
      </div>

      {/* --- PROGRESS DOTS (3 dots) --- */}
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
        className={`absolute bottom-16 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <button
          onClick={() => goToPage(page - 1)}
          aria-label="Up"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronUp className="text-white" size={32} />
        </button>
      </div>

      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === lastDotId ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <button
          onClick={() => goToPage(page + 1)}
          aria-label="Down"
          className="p-2 hover:opacity-80 transition-opacity"
        >
          <ChevronDown className="text-white" size={32} />
        </button>
      </div>

      {/* --- NEXT ARROW (visible only on last screen) --- */}
      <div
        className={`absolute bottom-8 right-5 z-[60] group transition-opacity duration-700 flex items-center ${
          at === lastDotId ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="absolute right-12 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white whitespace-nowrap">
          Go to News
        </span>
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
