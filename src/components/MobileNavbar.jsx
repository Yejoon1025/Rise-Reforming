// MobileNavbar.jsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react"; // yarn add lucide-react (or npm i lucide-react)
import { createPortal } from "react-dom";
import logo from "../assets/Logo_Transparent.png";

export default function Navbar() {
  const [isNearTop, setIsNearTop] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Preserve your original "near top" behavior for desktop (mouse),
  // and make it work on mobile by watching scroll position.
  useEffect(() => {
    function handleMouseMove(e) {
      setIsNearTop(e.clientY < 80);
    }
    function handleScroll() {
      const y = window.scrollY;
      setScrolled(y > 8);
      // On mobile there is no mouse; treat being at the very top as "near top"
      setIsNearTop(y <= 8);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when the mobile menu is open
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  const linkBase =
    "hover:no-underline focus:no-underline active:no-underline focus-visible:outline-none";

  const linkGlow = isNearTop
    ? "text-[#f8da9c] [text-shadow:0_0_6px_rgba(248,218,156,0.8)]"
    : "text-[#f8da9c]/70";

  // ---- Mobile menu portal (renders above GlowDot portals) ----
  const mobilePanel = createPortal(
    <div
      // Fullscreen layer to guarantee we're above GlowDot's z-40 textbox
      className={`fixed inset-0 z-[70] md:hidden ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      {/* Click-away backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Panel container near the top-right (under the header bar) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`absolute right-0 top-16 origin-top-right transition-[transform,opacity] duration-300 ${
            open ? "opacity-100 scale-y-100" : "opacity-0 scale-y-95"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <ul className="w-[18rem] sm:w-[22rem] grid gap-2 rounded-2xl border border-white/10 bg-[#0c1a22]/95 p-3 font-bahnschrift text-xl text-[#f8da9c] shadow-2xl shadow-black/40 text-center">
            <li>
              <Link
                className={`${linkBase} block rounded-xl px-3 py-3 active:bg-white/5`}
                to="/home"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                className={`${linkBase} block rounded-xl px-3 py-3 active:bg-white/5`}
                to="/tech"
              >
                Tech
              </Link>
            </li>
            <li>
              <Link
                className={`${linkBase} block rounded-xl px-3 py-3 active:bg-white/5`}
                to="/team"
              >
                Team
              </Link>
            </li>
            <li>
              <Link
                className={`${linkBase} block rounded-xl px-3 py-3 active:bg:white/5`}
                to="/news"
              >
                News
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-60 transition-colors duration-300 ${
          scrolled ? "bg-[#0c1a22]/80 backdrop-blur" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/home" className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-auto" />
            </Link>

            {/* Desktop links */}
            <ul
              className={`hidden md:grid grid-cols-4 gap-x-16 font-bahnschrift text-lg ${linkGlow}`}
            >
              <li className="justify-self-center">
                <Link className={linkBase} to="/home">
                  Home
                </Link>
              </li>
              <li className="justify-self-center">
                <Link className={linkBase} to="/tech">
                  Tech
                </Link>
              </li>
              <li className="justify-self-center">
                <Link className={linkBase} to="/team">
                  Team
                </Link>
              </li>
              <li className="justify-self-center">
                <Link className={linkBase} to="/news">
                  News
                </Link>
              </li>
            </ul>

            {/* Mobile toggle */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl border border-white/10 text-[#f8da9c] transition active:scale-95"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu rendered above everything via portal */}
      {mobilePanel}
    </>
  );
}
