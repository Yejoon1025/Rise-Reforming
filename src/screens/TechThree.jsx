import bg from '../assets/VidOne.mp4'
import { useRef,useState,useEffect } from "react"

const CONTENT_URL =
  "https://raw.githubusercontent.com/Yejoon1025/rise-content/main/Content.json"

export function TechThree() {

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
  
      const Tech6 = content?.Tech6 ?? ""
      const Tech7 = content?.Tech7 ?? ""
      const Tech8 = content?.Tech8 ?? ""
      const Tech6Title = content?.Tech6Title ?? ""
      const Tech7Title = content?.Tech7Title ?? ""
      const Tech8Title = content?.Tech8Title ?? ""

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        src={bg}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Optional dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Foreground content */}
      <div className="relative z-10 flex items-center justify-center h-full px-10">
        <div className="max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#f8da9c]">
            {Tech8Title}
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/80 leading-relaxed">
            {Tech8}
          </p>
        </div>
      </div>
    </div>
  )
}
