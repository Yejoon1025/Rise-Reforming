// src/pages/TechTwo.jsx
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import bg from "../assets/unedited/Tech.png"

export function TechTwo() {
  const [page, setPage] = useState(0) // 0 = hero, 1 = dots
  const [isAnimating, setIsAnimating] = useState(false)

  // Configure dot positions as percentages (left %, top %)
  const dotPositions = [
    { left: "30%", top: "40%" },
    { left: "60%", top: "35%" },
    { left: "45%", top: "60%" },
    { left: "70%", top: "70%" },
  ]

  function handleNext() {
    if (isAnimating) return
    setIsAnimating(true)
    setTimeout(() => {
      setPage(1)
      setIsAnimating(false)
    }, 600) // matches transition duration
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden text-white font-bahnschrift"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed", // keeps background still
      }}
    >
      {/* Hero Page */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center space-y-8 transition-transform duration-700 ${
          page === 0 && !isAnimating ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <h1 className="text-3xl md:text-5xl text-white text-center">
          Rise&apos;s proprietary process is
        </h1>
        <button
          onClick={handleNext}
          className="flex flex-col items-center text-[#f8da9c] hover:opacity-80 transition"
        >
          <ChevronDown size={48} />
        </button>
      </div>

      {/* Dots Page */}
      <div
        className={`absolute inset-0 transition-transform duration-700 ${
          page === 1 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {dotPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute w-10 h-10 rounded-full bg-white shadow-[0_0_12px_4px_rgba(255,255,255,0.7)]"
            style={{
              left: pos.left,
              top: pos.top,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
    </div>
  )
}