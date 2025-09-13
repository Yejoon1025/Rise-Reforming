import { useRef } from "react"
import bg from "../assets/HomeTwo.png"

export default function Temporary() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="h-screen w-full flex justify-center relative">
        <h2 className="absolute top-[30%] font-bahnschrift text-4xl md:text-6xl text-[#f8da9c] px-6 text-center">
          Under Construction... Coming Soon!
        </h2>
      </div>
    </section>
  )
}