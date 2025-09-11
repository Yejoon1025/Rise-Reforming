// src/App.jsx
import { useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

import LoadingSplash from "./pages/LoadingSplash"
import Home from "./pages/Home"
import { Tech } from "./pages/Tech"
import { TeamPage } from "./pages/TeamPage"
import {NewsPage} from "./pages/NewsPage"
import { TechTwo } from "./pages/TechTwo"

import Footer from "./components/Footer"
import Temporary from "./pages/Temporary"

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <div className="min-h-dvh bg-brand-dark text-white">
      {showSplash && <LoadingSplash onDone={() => setShowSplash(false)} />}

      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/tech" element={<Tech />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="*" element={<Temporary/>} />
      </Routes>
    </div>
  )
}
// <Route path="*" element={<Navigate to="/about" replace />} />