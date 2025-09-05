import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import logo from "../assets/Logo_Transparent.png"

export default function Navbar() {
  const [isNearTop, setIsNearTop] = useState(false)

  useEffect(() => {
    function handleMouseMove(e) {
      if (e.clientY < 80) setIsNearTop(true)
      else setIsNearTop(false)
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <nav className="fixed top-0 left-0 w-full flex items-center justify-between px-8 py-4 bg-transparent z-50">
      {/* Logo */}
      <div className="flex items-center">
        <img
          src={logo}
          alt="Logo"
          className="h-14 w-auto"
        />
      </div>

      {/* Navigation Links */}
      <ul
        className={`grid grid-cols-4 gap-x-20 flex-1 max-w-2xl font-bahnschrift text-xl ml-auto pr-20 translate-y-[2px] transition-all duration-300 ${isNearTop
            ? "text-[#f8da9c] [text-shadow:0_0_6px_rgba(248,218,156,0.8)]"
            : "text-[#f8da9c]/70"
          }`}
      >
        <li className="justify-self-center">
          <Link to="/about" className="hover:no-underline focus:no-underline active:no-underline">
            About
          </Link>
        </li>
        <li className="justify-self-center">
          <Link to="/tech" className="hover:no-underline focus:no-underline active:no-underline">
            Tech
          </Link>
        </li>
        <li className="justify-self-center">
          <Link to="/team" className="hover:no-underline focus:no-underline active:no-underline">
            Team
          </Link>
        </li>
        <li className="justify-self-center">
          <Link to="/news" className="hover:no-underline focus:no-underline active:no-underline">
            News
          </Link>
        </li>
      </ul>
    </nav>
  )
}
