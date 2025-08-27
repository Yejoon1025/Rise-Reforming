// src/components/hooks/use-cover-anchor.js
import { useEffect, useMemo, useRef, useState } from "react"

export function useCoverAnchor({ containerRef, imageSrc, normX, normY }) {
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [box, setBox] = useState({ w: 0, h: 0 })
  const roRef = useRef(null)

  // Load image to get intrinsic size
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = imageSrc
  }, [imageSrc])

  // Observe container size
  useEffect(() => {
    const el = containerRef?.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect
      if (!r) return
      setBox({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    roRef.current = ro
    // prime
    const r = el.getBoundingClientRect()
    setBox({ w: Math.round(r.width), h: Math.round(r.height) })
    return () => ro.disconnect()
  }, [containerRef])

  const { top, left, ready } = useMemo(() => {
    const { w: imgW, h: imgH } = natural
    const { w: cw, h: ch } = box
    if (!imgW || !imgH || !cw || !ch) return { top: 0, left: 0, ready: false }

    // cover math
    const scale = Math.max(cw / imgW, ch / imgH)
    const dispW = imgW * scale
    const dispH = imgH * scale
    const offX = (cw - dispW) / 2
    const offY = (ch - dispH) / 2

    // normalized coords → pixels within container
    const x = offX + normX * dispW
    const y = offY + normY * dispH
    return { top: y, left: x, ready: true }
  }, [natural, box, normX, normY])

  return { top, left, ready }
}