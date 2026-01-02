import { useRef,useState,useEffect } from "react"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import bg from "../assets/HomeOneLight.png"

const CONTENT_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Content.json"


export default function OverlayTwo({ containerRef }) {
  const sectionRef = containerRef

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

  const Home1 = content?.Home1 ?? ""
  const Home2 = content?.Home2 ?? ""
  const Home3 = content?.Home3 ?? ""


  return (
      

    <div className="h-full w-full flex items-center justify-center">
      <h2 className="absolute top-[60%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Today's Waste
        </h2>
      <GlowDotProvider
              baseRef={sectionRef}         // ← base element we animate/commit
              openStrategy="next"
              threshold={0.3}
            >
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.75}
                normY={0.55}
                text= {Home1}
                dotId="h1-1"
                defaultOffsetX = {-300}
                defaultOffsetY = {-400}
                boxNumber = "1"
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.32}
                normY={0.42}
                text= {Home2}
                dotId="h1-2"
                defaultOffsetX = {0}
                defaultOffsetY = {-260}
                boxNumber = "2"
              />    
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.2}
                normY={0.6}
                text= {Home3}
                dotId="h1-3"
                defaultOffsetX = {-100}
                defaultOffsetY = {0}
                boxNumber = "3"
              />    
            </GlowDotProvider>
    </div>
  )
}