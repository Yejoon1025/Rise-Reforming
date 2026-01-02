import { useRef, useEffect, useState } from "react"
import bg from "../assets/NewsDark.png"
import overlayBg from "../assets/NewLight.png"
import { TimeLine } from "../components/TimeLine"
import Navbar from "../components/Navbar"

const DATA_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/News.json"

export default function News() {
  const timelineRef = useRef(null)
  const [showNavbar, setShowNavbar] = useState(true)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Scroll listener (same as your original)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setShowNavbar(false)
      } else {
        setShowNavbar(true)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // ✅ Fetch news items from remote JSON
  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(DATA_URL, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Failed to load news: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()
        setItems(data)
      } catch (err) {
        if (err.name === "AbortError") return
        console.error(err)
        setError("Could not load news timeline.")
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [])

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
      <header
        className="relative z-30 transition-opacity duration-500"
        style={{ opacity: showNavbar ? 1 : 0 }}
      >
        <Navbar />
      </header>

      <section className="relative z-20 flex min-h-[40vh] items-center justify-center px-6">
        <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight absolute top-[30vh]">
          The Rise Reforming Timeline
        </h1>
      </section>

      <section ref={timelineRef} className="relative z-10">
        {loading && (
          <div className="py-10 text-center text-sm text-gray-300">
            Loading timeline…
          </div>
        )}

        {error && (
          <div className="py-10 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && (
          <TimeLine
            items={items}
            backgroundUrl={bg}
            overlayUrl={overlayBg}
            color="#3ca6a6"
            dotSize={12}
            cardWidth={420}
          />
        )}
      </section>

    </div>
  )
}
