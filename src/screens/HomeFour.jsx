import { useRef,useState,useEffect } from "react"
import bg from "../assets/Globe.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"

const CONTENT_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Content.json"

export function HomeFour() {
  const sectionRef = useRef(null)

  const [content, setContent] = useState(null)

  useEffect(() => {
    let isMounted = true

    fetch(CONTENT_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load Content.json")
        return res.json()
      })
      .then((data) => {
        if (isMounted) setContent(data)
      })
      .catch((err) => {
        console.error("Error loading Content.json:", err)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const Home9 = content?.Home9 ?? ""
  const Home10 = content?.Home10 ?? ""

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[20%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Our Impact
        </h2>
      </div>
      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="all"          // or "next"
        threshold={0.3}
      >

         <PinnedGlowDot
            containerRef={sectionRef}
            imageSrc={bg}
            normX={0.32}
            normY={0.42}
            text= {Home9}
            dotId="h5-1"
            defaultOffsetX = {-100}
            defaultOffsetY = {100}
            boxNumber = "1"
          />
          <PinnedGlowDot
            containerRef={sectionRef}
            imageSrc={bg}
            normX={0.6}
            normY={0.7}
            text= {Home10}
            dotId="h5-2"
            defaultOffsetX = {-200}
            defaultOffsetY = {-150}
            boxNumber = "2"
          />
      </GlowDotProvider>
    </section>
  )
}