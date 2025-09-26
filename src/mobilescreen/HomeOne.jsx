import { useRef } from "react"
import bg from "../assets/HomeOneDark.png"

export default function HomeOne() {
  const sectionRef = useRef(null)

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
    </section>
  )
}