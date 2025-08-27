// src/App.jsx
import { useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"

import LoadingSplash from "./pages/LoadingSplash"
import { HomeOne } from "./pages/HomeOne"
import { Tech } from "./pages/Tech"

import Footer from "./components/Footer"
import { Temporary } from "./pages/Temporary"

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <div className="min-h-dvh bg-brand-dark text-white">
      {showSplash && <LoadingSplash onDone={() => setShowSplash(false)} />}

      <Temporary />
      {/*
      <Routes>
        <Route path="/about" element={<HomeOne />} />
        <Route path="/tech" element={<Tech />} />
        <Route path="/team" element={<HomeOne />} />
        <Route path="/news" element={<HomeOne />} />
        <Route path="*" element={<Navigate to="/about" replace />} />
      </Routes>
      */}
    </div>
  )
}