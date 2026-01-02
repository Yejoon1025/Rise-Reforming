import { useRef,useState,useEffect } from "react"
import { GlowDotProvider } from "../components/GlowDotProvider"
import { PinnedGlowDot } from "../components/PinnedGlowDot"
import bg from "../assets/TechOne.png"

const CONTENT_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Content.json"

export default function TechOverlayTwo({ containerRef }) {
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

    const Tech1 = content?.Tech1 ?? ""
    const Tech2 = content?.Tech2 ?? ""
    const Tech3 = content?.Tech3 ?? ""
    const Tech4 = content?.Tech4 ?? ""
    const Tech5 = content?.Tech5 ?? ""
    const Tech1Title = content?.Tech1Title ?? ""
    const Tech2Title = content?.Tech2Title ?? ""
    const Tech5Title = content?.Tech5Title ?? ""


  return (
      

    <div className="h-full w-full flex items-center justify-center">
      <h2 className="font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center z-20">
        In Simple Terms, We:
      </h2>
      <GlowDotProvider
              baseRef={sectionRef}         // ← base element we animate/commit
              openStrategy="next"
              threshold={0.3}
            >
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.7}
                normY={0.35}
                title = {Tech1Title}
                text= {Tech1}
                dotId="t1-1"
                defaultOffsetX = {-100}
                defaultOffsetY = {-100}
                boxNumber = "1"
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.35}
                normY={0.3}
                title = {Tech2Title}
                text= {Tech2}
                dotId="t1-2"
                defaultOffsetX = {-100}
                defaultOffsetY = {-150}
                boxNumber = "2"
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.8}
                normY={0.68}
                title = {Tech5Title}
                text= {Tech5}
                dotId="t1-3"
                defaultOffsetX = {-100}
                defaultOffsetY = {-100}
                boxNumber = "3"
              />    
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.35}
                normY={0.3}
                text= {Tech3}
                dotId="t1-4"
                defaultOffsetX = {-300}
                defaultOffsetY = {230}
              />
              <PinnedGlowDot
                containerRef={sectionRef}
                imageSrc={bg}
                normX={0.35}
                normY={0.3}
                text= {Tech4}
                dotId="t1-5"
                defaultOffsetX = {100}
                defaultOffsetY = {230}
              />
            </GlowDotProvider>
    </div>
  )
}