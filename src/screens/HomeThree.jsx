import { useRef,useState,useEffect } from "react"
import bg from "../assets/HomeThree.png"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"

const CONTENT_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Content.json"

export function HomeThree() {
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
  
    const Home6 = content?.Home6 ?? ""
    const Home7 = content?.Home7 ?? ""
    const Home8 = content?.Home8 ?? ""
    const Home6Title = content?.Home6Title ?? ""
    const Home7Title = content?.Home7Title ?? ""
    const Home8Title = content?.Home8Title ?? ""

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-full w-full flex items-center justify-center">
        <h2 className="absolute top-[50%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Tomorrow's Value
        </h2>
      </div>

      <GlowDotProvider
        baseRef={sectionRef}
        openStrategy="next"          // or "next"
        threshold={0.3}
      >

        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.7}
                        normY={0.34}
                        title = {Home6Title}
                        text= {Home6}
                        dotId="h3-1"
                        defaultOffsetX = {-30}
                        defaultOffsetY = {-300}
                        boxNumber = "1"
                      />

        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.2}
                        normY={0.7}
                        title = {Home7Title}
                        text= {Home7}
                        dotId="h3-2"
                        defaultOffsetX = {-100}
                        defaultOffsetY = {-100}
                        boxNumber = "2"
                      />
        <PinnedGlowDot
                        containerRef={sectionRef}
                        imageSrc={bg}
                        normX={0.78}
                        normY={0.66}
                        title = {Home8Title}
                        text= {Home8}
                        dotId="h3-3"
                        defaultOffsetX = {-120}
                        defaultOffsetY = {-50}
                        boxNumber = "3"
                      />

      </GlowDotProvider>
    </section>
  )
}