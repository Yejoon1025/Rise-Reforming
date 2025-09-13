import { ChevronDown } from "lucide-react"

export default function TechOverlayOne() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <h1 className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight">
        Our Technology
      </h1>
      <div className="absolute inset-x-0 bottom-10 flex justify-center">
        <ChevronDown
          className="w-12 h-12 animate-bounce transition-transform group-active:translate-y-1"
          style={{ color: "#f8da9c" }}
        />
      </div>
    </div>
  )
}