import { useRef,useState,useEffect } from "react"
import bg from "../assets/HomeTwo.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"

const CONTENT_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Content.json"

export function HomeTwo() {
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
  
    const Home4 = content?.Home4 ?? ""
    const Home5 = content?.Home5 ?? ""
    const Home4Title = content?.Home4Title ?? ""

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[30%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Turns Into
        </h2>
      </div>
      <GlowDotProvider
        baseRef={sectionRef}         // ← base element we animate/commit
        openStrategy="next"
        threshold={0.3}
      >
        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.49}
                        normY={0.7}
                        title = {Home4Title}
                        text= {Home4}
                        dotId="h2-1"
                        defaultOffsetX = {-500}
                        defaultOffsetY = {-200}
                        boxNumber = "1"
                      />
        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.62}
                        normY={0.65}
                        text= {Home5}
                        dotId="h2-2"
                        defaultOffsetX = {100}
                        defaultOffsetY = {-200}
                        boxNumber = "2"
                      />
      </GlowDotProvider>
    </section>
  )
}